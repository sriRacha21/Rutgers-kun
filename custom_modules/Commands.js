const DEBUG = require('./Constants.js').DEBUG;

// IMPORTS
const Discord = require('discord.js')
const { Client, RichEmbed } = require('discord.js')
const Constants = require( './Constants.js' )
const Help = require('./Help.js');

const HashTable = require('hashtable');
// store the timers for mute
const htTimers = new HashTable();
// This hash table stores the verification codes for Rutgers Student role approval.
const htCodes = new HashTable();
// This hash table associates user id's with their GuildMember object in RED.
const htMembers = new HashTable();
// This hash table stores an array of quotes associated with a GuildMember.
const htQuotes = new HashTable();
// custom commands
const htCommandAndGuild = new HashTable();
const htGuildCommandsList = new HashTable();
const htUserCommand = new HashTable();
// filtered words
const htFilteredWords = new HashTable();
// used to download file from attachment
const https = require('https');
// file writing to save and load commands
const fs = require('fs');
// util
const util = require('util');

// This global variables stops !giveallperms from being run more than once in one instance.
var allPermsGiven = false;

/**
 * This function is a command that is called upon processing the "roles" command. It sends a message back to the same channel with a list of roles in the server.
 * @param {string[]} arguments - An array of arguments passed to the command. These will simply be ignored for now.
 * @param {@link Message} msg - The message object that is being processed.
 */
exports.rolesCommand = function( arguments, msg, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    // can't use this command in bot commands
    if( !exports.isRunnable( msg ) )
        return;

    let roles = [];
    msg.guild.roles.forEach(( role ) => {
        if( arguments[0] && role.name.toLowerCase().includes(arguments[0]) )
            roles.push( role );
    });
    if( !arguments[0] )
        roles = msg.guild.roles;
    msg.channel.send( collToEmbedRoles ( roles, true, Constants.Permissions.PRIORITYSPEAKER ) );
}

/**
 * This function is a command that is called upon processing the "ping" command. It replies to the user that sent the ping with a "pong".
 * @param {string[]} arguments - An array of arguments passed to the command. These will simply be ignored for now.
 * @param {@link Message} msg - The message object that is being processed.
 */
exports.pingCommand = function( arguments, msg, client ) {
    if( !exports.isRunnable( msg ) )
        return;

    if( arguments.length > 0 ) {
        msg.channel.send( Constants.Strings.WRONGARGS );
    } else {
        if( client.pings[0] )
        msg.reply( Constants.Strings.PONG + client.pings[0] + "ms" );
    }
}

/**
 * A command that allows for the addition and removal of roles.
 * @param {string[]} arguments - An array of arguments passed to the command. These will be added onto the sent message.
 * @param {@link Message} msg - The message object that is being processed.
 */
exports.roleCommand = function( arguments, msg, client, prefix ) {
    if( !exports.isRunnable( msg ) )
        return;

    console.log( "arguments: " + arguments );

    if( arguments[0] != "list" && arguments.length <= 1 )
        Help.helpCommand( [Constants.Commands.ROLE], msg, false, client, prefix );
    else {
        if( arguments[0] == "list" ) {
            exports.rolesCommand( arguments.slice(1), msg, prefix );
            return;
        }
        // logic to separate arguments by comma. Very dirty implementation :(
        arguments[0] = arguments[0] + ",";
        let argumentsStr = arguments.join(" ");
        arguments = argumentsStr.toLowerCase().split(", ");

        if( arguments[0] == Constants.Strings.ADDROLE ) {
            let certainRoles = roleExclude( msg.guild.roles );
            let userRoles = roleExclude( msg.member.roles );
            let rolesToAdd = [];
            let roleToRemove;
            let invalidRoleTriedToAdd;
            let notifyMods = false;
            let addingProtectedRole = false;
            let duplicateRoleFlag = false;
            let tooManyPrivFlag = false;
            let exitFlag = false;

            // Permission checking and role addition loop
            argumentloop:
            for( let i = 1; i < arguments.length; i++ ) {
                let argument = arguments[i];

                // Skip roles already added and do not allow duplicate roles to be added
                for( let j = 0; j < userRoles.length; j++ ) {
                    let role = userRoles[j];
                    if( isStudentAlumniGuest( role ) )
                        roleToRemove = role;
                    if( argument == role.name.toLowerCase() ) {
                        duplicateRoleFlag = true;
                        exitFlag = true;
                        continue argumentloop;
                    }
                }

                // Skip adding privileged roles. We know the user added them through agree so we don't need to check if they have one already.
                for( let k = 0; k < Constants.PrivilegedRoles.length; k++ ) {
                    let privRole = Constants.PrivilegedRoles[k].toLowerCase();
                    if( argument == privRole ) {
                        tooManyPrivFlag = true;
                        exitFlag = true;
                        continue argumentloop;
                    }
                }


                // prepare roles that are allowed to be added to be added
                for( let j = 0; j < certainRoles.length; j++ ) {
                    let role = certainRoles[j];

                    // console.log( "comparing " + role.name.toLowerCase() + " to " + argument );
                    if( role.name.toLowerCase() == argument ) {
                        if( role.hasPermission( Constants.Permissions.PRIORITYSPEAKER, false, true ) ) {
                            invalidRoleTriedToAdd = role.name;
                            // Set flag indicating to notify mods
                            notifyMods = true;
                            exitFlag = true;
                            // Stop role addition process
                            break;
                        }
                        if( isStudentAlumniGuest( role ) )
                            addingProtectedRole = true;
                        if( isStudent( role ) ) {
                            addingProtectedRole = false;
                            tooManyPrivFlag = true;
                            exitFlag = true;
                            continue argumentloop;
                        }

                        rolesToAdd.push( role );
                    }
                }
                if( notifyMods )
                    break;
            }

            let auditChannel = getChannelByName( msg, Constants.Strings.BOTOUTPUT );
            if( auditChannel === undefined ) {
                console.log( Constants.Strings.NOAUDITWARN + msg.guild.name );
                return;
            }

            if( notifyMods ) {
                msg.channel.send( Constants.Strings.ATTEMPTEDROLEADD );
                auditChannel.send( msg.author.tag + Constants.Strings.TRIEDTOADDROLE + invalidRoleTriedToAdd );
                return;
            }

            // handle promise
            msg.member.addRoles( rolesToAdd, Constants.Strings.ROLEREASON )
            .then( function() {
                if( addingProtectedRole ) 
                    msg.member.removeRole( roleToRemove, Constants.Strings.ROLEREASON );
            })
            .catch( function(error) {
                msg.channel.send( Constants.Strings.NOPERMROLE );
                console.log( "error details: " );
                console.error;
            });

            let roleNames = [];
            rolesToAdd.forEach(( role ) => {
                roleNames.push( role.name )
            });

            if( duplicateRoleFlag )
                msg.channel.send( Constants.Strings.DUPLICATEROLE );
            if( tooManyPrivFlag )
                msg.channel.send( Constants.Strings.TOOMANYPRIV );

            // Logic to return proper message
            if( rolesToAdd.length == 0 && exitFlag )
                return;
            else if( rolesToAdd.length == 0 )
                msg.channel.send( Constants.Strings.NOROLEADDDONE );
            else
                msg.channel.send( roleNames.join( " and " ) + Constants.Strings.ADDROLEDONE );

            if( addingProtectedRole ) {
                msg.channel.send( roleToRemove.name + Constants.Strings.REMOVEROLEDONE );
                if( roleToRemove.name == Constants.SpecialRoles[0] && roleNames[0] == Constants.SpecialRoles[1] )
                    msg.channel.send( Constants.Strings.CONGRATULATIONSGRAD );
            }
        }
        if( arguments[0] == Constants.Strings.REMOVEROLE ) {
            let certainRoles = roleExclude( msg.member.roles );
            let userRoles = roleExclude( msg.member.roles );
            let rolesToRemove = [];
            let roleNotFoundFlag = true;
            let roleNotRemovableFlag = false;

            // Outer loop loops through arguments passed
            for( let i = 1; i < arguments.length; i++ ) {
                let argument = arguments[i];

                // Don't remove roles a user doesn't have
                roleNotFoundFlag = true;
                for( let j = 0; j < userRoles.length; j++ ) {
                    let role = userRoles[j];
                    if( argument == role.name.toLowerCase() )
                        roleNotFoundFlag = false;
                }

                // Remove roles found in arguments
                for( let j = 0; j < certainRoles.length; j++ ) {
                    let role = certainRoles[j];

                    if( role.name.toLowerCase() == argument ) {
                        rolesToRemove.push( role );
                    }
                }

                rolesToRemove.forEach(( role ) => {
                    let argument = role.name.toLowerCase();
                    if( argument == Constants.Strings.GUESTROLE.toLowerCase() || argument == Constants.Strings.ALUMNIROLE.toLowerCase() || argument == Constants.Strings.SCHOOLROLE.toLowerCase() ) {
                        rolesToRemove.push( getRoleByName( msg, Constants.Strings.PRIVROLE ) );
                    } else if( argument == Constants.Strings.PRIVROLE.toLowerCase() ) {
                        roleNotRemovableFlag = true;
                        rolesToRemove.splice( rolesToRemove.indexOf( role ), 1 )
                    }
                });
            }
            // handle promise
            msg.member.removeRoles( rolesToRemove, Constants.Strings.ROLEREASON )
            .catch(function(error) { msg.channel.send( Constants.Strings.NOPERMROLE ); });

            let roleNames = [];
            rolesToRemove.forEach(( role ) => {
                roleNames.push( role.name )
            });

            if( roleNotFoundFlag )
                msg.channel.send( Constants.Strings.NOTFOUNDROLE );

            if( roleNotRemovableFlag )
                msg.channel.send( Constants.Strings.ROLENOTREMOVABLEWARN );

            // Send appropriate message to channel
            if( ( roleNotRemovableFlag || roleNotFoundFlag ) && rolesToRemove.length == 0 )
                return;
            else if( rolesToRemove.length == 0 )
                msg.channel.send( Constants.Strings.NOROLEREMOVEDDONE );
            else
                msg.channel.send( roleNames.join(" and ") + Constants.Strings.REMOVEROLEDONE );
        }
    }
}

/**
 * A command that is called upon a message being deleted.
 * @param {@link Message} msg - The deleted message.
 */
exports.deletedCommand = function( msg, client ) {
    let auditChannel = getChannelByName( msg, Constants.Strings.AUDIT );

    if( auditChannel === undefined ) {
        msg.channel.send( Constants.Strings.NOAUDITWARN );
        return;
    }

    console.log( msg.author.tag + "'s message was deleted in channel #" + msg.channel.name + " in guild " + msg.guild.name + ". It has been captured and will be reproduced elsewhere. Here are its contents: " + msg.cleanContent );
    let deletedUser = Constants.Strings.DELETEDAUTHOR;

    let embed = new RichEmbed()
        .setAuthor( deletedUser, client.user.displayAvatarURL )
        .setTitle( msg.author.tag )
        .setColor(0xFF0000);

    if( msg.content != "" && !(msg.content.length > 1024) )
        embed.addField( Constants.Strings.DELETEDMESSAGE, msg.content );
    else if( msg.content.length > 1024 )
        embed.addField( Constants.Strings.DELETEDMESSAGE, "See above" );

    embed.addField( Constants.Strings.INCHANNEL, msg.channel )
        .addField( Constants.Strings.DELETEDMESSAGELINK, msg.url )
        .addField( Constants.Strings.MESSAGEID, msg.id )
        .setThumbnail( msg.author.displayAvatarURL )
        .setFooter( Constants.Strings.TIMESTAMP + msg.createdAt );

    let i = 1;
    msg.attachments.forEach(( attachment ) => {
        embed.addField(  "**Attachment " + i + ":**\nFilename: " + attachment.filename, attachment.proxyURL )
        i++;
    });

    auditChannel.send( embed )
    .catch( console.error );

    if( msg.content.length > 1024 )
        auditChannel.send( msg.content );
}

/**
 * A command that is called upon a message being edited. This returns the message before and after editing to #audit.
 * @param {@link Message} msg - The message before edit.
 * @param {@link Message} nm - The message after edit.
 */
exports.editedCommand = function( msg, nm, client ) {    
    let auditChannel = getChannelByName( msg, Constants.Strings.AUDIT );

    if( auditChannel === undefined ) {
        msg.channel.send( Constants.Strings.NOAUDITWARN );
        return;
    }

    console.log( msg.member + "'s message was edited in channel #" + msg.channel.name + " in guild " + msg.guild.name + ". This change has been captured and will be reproduced elsewhere." );
    let editedUser = Constants.Strings.EDITEDAUTHOR;
    let embed = new RichEmbed()
        .setAuthor( editedUser, client.user.displayAvatarURL )
        .setTitle( msg.author.tag )
        .setColor( 0xFF0000 )
        .addField( Constants.Strings.INCHANNEL, msg.channel )
        .addField( Constants.Strings.EDITEDMESSAGELINK, msg.url )
        .setThumbnail( msg.author.displayAvatarURL )
        .setFooter( Constants.Strings.TIMESTAMP + nm.createdAt );
    
    if( msg.content.length <= 1024 && nm.content.length <= 1024 ) {
        embed.addField( Constants.Strings.EDITEDOLDMESSAGE, msg.content ? msg.content : "." )
        .addField( Constants.Strings.EDITEDNEWMESSAGE, nm.content )
    } else {
        embed.addField( Constants.Strings.EDITEDOLDMESSAGE, "See above" );
        auditChannel.send( "**Old:** " + msg.content ? msg.content : "." );
        auditChannel.send( "**New:** " + nm.content );
    }

    embed.addField( Constants.Strings.MESSAGEID, msg.id );

    auditChannel.send( embed )
    .catch( console.error );
}

exports.scheduleCommand = function( arguments, msg, client, prefix ) {
    if( !msg.member.hasPermission( Constants.Permissions.MENTIONEVERYONE ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments.length == 4 ) {
        // get arguments as local variables
        let message = arguments[0].split(" ").splice(1).join(" ");
        let channelRead = arguments[1].split(" ");
        let rolesToPingRead = arguments[2].split(" ");
        let timeString = arguments[3].split(" ");

        // console.log( "message: " + message + "\nchannels: " + channelRead + "\nrolesToPing: " + rolesToPingRead + "\ntimeString: " + timeString );

        // prepare to set timer
        let timeArr = timeStringToArr( timeString );
        let weeks = timeArr[0];
        let days = timeArr[1];
        let hours = timeArr[2];
        let minutes = timeArr[3];
        let seconds = timeArr[4];
        // time string check
        if( timeArr[0] == "error" ) {
            msg.channel.send( Constants.Strings.INVALIDTIMESTRING );
            return;
        }

        let channels = [];
        let rolesToPing = [];
        for( let i = 0; i < channelRead.length; i++ ) {
            if( getChannelByName( msg, channelRead[i] ) )
                channels.push( getChannelByName( msg, channelRead[i] ) );
        }
        for( let i = 0; i < rolesToPingRead.length; i++ ) {
            if( rolesToPingRead[i] == "everyone" )
                rolesToPingRead[i] = "@everyone";
            if( getRoleByName( msg, rolesToPingRead[i] ) )
                rolesToPing.push( getRoleByName( msg, rolesToPingRead[i] ) );
        }
        if( rolesToPing.length == 0 && rolesToPingRead[0].toLowerCase() != "none"  ) {
            msg.channel.send( Constants.Strings.ROLENOTFOUND );
            return;
        }

        for( let i = 0; i < channelRead.length; i++ ) {
            msg.guild.channels.forEach(( channelI ) => {
                // console.log( "channelRead: " + channelRead + "\nchannelReadLength: " + channelRead.length + "\nchannelRead[0]: " + channelRead[0] );
                let channelReadStr = channelRead[i].toString().substring( 2, channelRead[i].length - 1 );
                // console.log( "comparing " + channelI.id + " and " + channelReadStr );
                if( channelI.id == channelReadStr ) {
                    channels.push( channelI );
                }
            })

            if( channels.push == 0 ) {
                msg.channel.send( Constants.Strings.CHANNELNOTFOUND );
                return;
            }
        }

        let outStr = Constants.Strings.SCHEDULERAUTHOR + ": "+ msg.member + "\n\n";
        console.log( "roles: " + rolesToPing + "\nroles length: " + rolesToPing.length );
        for( let i = 0; i < rolesToPing.length; i++ )
            outStr += rolesToPing[i] + " ";
        outStr += message;
        let milliseconds = calcMilliseconds( weeks, days, hours, minutes, seconds );
        setTimeout( function () {
            for( let i = 0; i < channels.length; i++ )
                channels[i].send( outStr );
        }, milliseconds );
        let durString = buildDurationString( weeks, days, hours, minutes, seconds );
        msg.channel.send( Constants.Strings.SCHEDULEDANNOUNCEMENT + durString.substring( 0, durString.length - 1) + Constants.Strings.SCHEDULEDANNOUNCEMENT2 )
    } else {
        Help.helpCommand( [Constants.Commands.SCHEDULE], msg, false, client, prefix );
    }
}

/**
 * This command allows a user with the 'Kick Members' permission to mute/unmute users.
 * @param {string[]} arguments - The arguments passed to the command.
 * @param {@link Message} msg - The message that is being processed.
 * @param {boolean} isUnmute - Whether or not this command is being run to unmute a user.
 * @param {boolean} isTimer - Whether or not this command is being run through !unmute. In which case the timer must be manually stopped.
 */
exports.muteCommand = function( arguments, msg, isUnmute, isTimer, client, prefix ) {
    // managed server check
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( isUnmute === undefined )
        isUnmute = false;

    // permission check
    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS, false, true ) ) {
        msg.react( Constants.Strings.EYEROLL );
    } else if( !isUnmute && (arguments.length < 2 || arguments.length > 5) ) {
        Help.helpCommand( [Constants.Commands.MUTE], msg, false, client, prefix );
    } else {
        let timeArr = timeStringToArr( arguments.slice( 1, arguments.length ) );
        // time string check
        if( timeArr[0] == "error" ) {
            msg.channel.send( Constants.Strings.INVALIDTIMESTRING );
            return;
        }
        let weeks = timeArr[0];
        let days = timeArr[1];
        let hours = timeArr[2];
        let minutes = timeArr[3];
        let seconds = timeArr[4];

        let user;
        msg.mentions.members.forEach(( member ) => {
            user = member;
        })
        // try get by snowflake
        if( !user )
            user = msg.member.guild.member( arguments[0] );

        // check if user is found
        if( !user ) {
            msg.channel.send( Constants.Strings.USERNOTFOUNDWARN );
            return;
        }

        if( msg.member.highestRole.comparePositionTo( user.highestRole ) <= 0 ) {
            msg.channel.send( Constants.Strings.MUTEHIGHER );
            return;
        }

        if( !isUnmute )
          console.log( "Attempting to mute member " + user + " for " + weeks + " weeks " + days + " days " + hours + " hours " + minutes +
            " minutes " + seconds + " seconds." );

        let userToMute = user;
        let mutedRole = getRoleByName( msg, Constants.Strings.MUTEDROLE );
        let permissionsRole = getRoleByName( msg, Constants.Strings.PRIVROLE );

        if( userToMute === undefined ) {
            console.log( "match could not be found for user" );
            return;
        }
        if( mutedRole === undefined ) {
            console.log( "match could not be found for muted role" );
            msg.channel.send( Constants.Strings.ROLENOTFOUND );
            return;
        }
        if( permissionsRole === undefined ) {
            console.log( "match could not be found for  permissions role" );
            msg.channel.send( Constants.Strings.ROLENOTFOUND );
            return;
        }

        // Cancel the timer if unmute was triggered through commands
        if( !isTimer ) {
            clearTimeout( htTimers.get( userToMute + "mute" ));
            htTimers.remove( userToMute + "mute" );
        }

        // adjust roles appropriately to reflect muted status
        if( !isUnmute ) {
            userToMute.addRole( mutedRole );
            userToMute.removeRole( permissionsRole );
            let durationString = buildDurationString( weeks, days, hours, minutes, seconds );
            msg.channel.send( Constants.Strings.MUTING + userToMute.user.tag + Constants.Strings.MUTINGDURATION + durationString );
        } else {
            userToMute.addRole( permissionsRole );
            userToMute.removeRole( mutedRole );
            msg.channel.send( Constants.Strings.UNMUTING + userToMute.user.tag );
        }

        // theoretical limit of ~104249991.374 days given how large a number can be in js (approx 2^53)
        let milliseconds = calcMilliseconds( weeks, days, hours, minutes, seconds );
        if( !isUnmute ) {
            let timer = setTimeout( exports.muteCommand, milliseconds, arguments, msg, true, true, client, prefix );
            htTimers.put( userToMute + "mute", timer );
        }
    }
}

exports.ignoreCommand = function( arguments, msg, htIgnoredUsers, client, prefix ) {
    // permission check
    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) )
        msg.react( Constants.Strings.EYEROLL );
    else if( arguments.length >= 1 ) {
        // check mode
        let mode = arguments[0].toLowerCase();

        let user;
        if( mode == "add" || mode == "remove" ) {
            // set user to ignore
            msg.mentions.members.forEach(( member ) => {
                user = member;
            })
            // try get by snowflake
            if( !user )
                user = msg.member.guild.member( arguments[1] );

            // check if user is found
            if( !user ) {
                msg.channel.send( Constants.Strings.USERNOTFOUNDWARN );
                return;
            }
        }

        if( mode == "add" ) {
            if( arguments.length < 2 ) {
                msg.channel.send( Constants.Strings.IGNOREINSTRUCTION );
                return;
            }

            if( msg.member.highestRole.comparePositionTo( user.highestRole ) <= 0 ) {
                msg.channel.send( Constants.Strings.IGNOREHIGHER );
                return;
            }

            console.log( "comparing " + user.id + " and " + Constants.Strings.ARJUNID );
            if( user.id == Constants.Strings.ARJUNID ) {
                msg.channel.send( Constants.Strings.IGNORECREATOR );
                return;
            }

            htIgnoredUsers.put( user.id, true );
            let rand = Math.floor( Math.random() * Math.floor( 5 ) );
            let outStr;
            if( rand <= 4 ) 
                outStr = Constants.Strings.MEMBERIGNORED + user.user.tag;
            else
                outStr = Constants.Strings.GAMERFRIENDZONED + user.user.tag;
            if( arguments.length > 2 ) {
                let timeArr = timeStringToArr( arguments.slice( 2 ) );
                // time string check
                if( timeArr[0] == "error" ) {
                    msg.channel.send( Constants.Strings.INVALIDTIMESTRING );
                    return;
                }
                let weeks = timeArr[0];
                let days = timeArr[1];
                let hours = timeArr[2];
                let minutes = timeArr[3];
                let seconds = timeArr[4];

                // remove from hashtable on timer
                let milliseconds = calcMilliseconds( weeks, days, hours, minutes, seconds );
                arguments[0] = "remove";
                let timer = setTimeout( exports.ignoreCommand, milliseconds, arguments, msg, htIgnoredUsers );

                outStr += Constants.Strings.DURATION + buildDurationString( weeks, days, hours, minutes, seconds );
            }
            msg.channel.send( outStr );
        } else if( mode == "remove" ) {
            if( arguments.length < 2 ) {
                msg.channel.send( Constants.Strings.IGNOREINSTRUCTION );
                return;
            }
            htIgnoredUsers.remove( user.id );
            msg.channel.send( Constants.Strings.MEMBERUNIGNORED + user.user.tag );
        } else if( mode == "list" ) {
            let users = [];
            htIgnoredUsers.keys().forEach(( key ) => {
                users.push( key );
            });

            let retString = "";
            for( let i = 0; i < users.length; i++ ) {
                let userI = users[i];
                let userS = msg.member.guild.member( userI );
                if( userS )
                    retString += userS.user.tag + "\n";
            }
            let embed = new RichEmbed()
                .setTitle(Constants.Strings.EMUSERS)
                .setColor(0xFF0000)
                .setDescription( retString );

            if( retString == "" ) {
                msg.channel.send( Constants.Strings.NOIGNORESWARN );
                return;
            }

            msg.channel.send( embed );
        } else
            Help.helpCommand( [Constants.Commands.IGNORE], msg, false, client, prefix );
    } else
    Help.helpCommand( [Constants.Commands.IGNORE], msg, false, client, prefix );
}

/**
 * Checks user agreement. Split into multiple parts for Rutgers Student role verification and assignment.
 * @param {Mailgun} mailgun - The instance of mailgun to be used to send verification emails.
 * @param {string} domain - The domain to send the email from.
 * @param {string[]} arguments - The arguments sent to the command.
 * @param {Message} msg - The message to process. Can be a DM or in a textchannel.
 * @param {HashTable} htNewMembers - The {@link HashTable} containing timers of new members.
 * @param {number} part - The part of the agree command to invoke. Part 1 processes !agree, part 2 processes the email, part 3 processes the verification code and part 4 happens when the command is not executed in the right channel.
 */
exports.agreeCommand = function( mailgun, domain, arguments, msg, htNewMembers, part ) {
    if( part == 1 ) {
        let user = msg.author;
        let alumniRole = getRoleByName( msg, Constants.Strings.ALUMNIROLE );
        let guestRole = getRoleByName( msg, Constants.Strings.GUESTROLE );
        let privRole = getRoleByName( msg, Constants.Strings.PRIVROLE );

        if( msg.channel.name != Constants.Strings.AGREEMENT ) {
            let agreementChannel = getChannelByName( msg, Constants.Strings.AGREEMENT );
            msg.channel.send( Constants.Strings.NOTAGREEMENT + agreementChannel + Constants.Strings.NOTAGREEMENT2 );
            return;
        }

        if( arguments.length == 0 ) {
            user.send( Constants.Strings.AGREEMOREARGS );
            return;
        } else if( arguments.length >= 2 ) {
            user.send( Constants.Strings.AGREELESSARGS );
            return;
        }

        switch( arguments[0] ) {
            case Constants.Strings.SCHOOL.toLowerCase():
                user.send( Constants.Strings.REQUESTEMAIL );
                htMembers.put( user.id, msg.member );
                break;
            case Constants.Strings.ALUMNI.toLowerCase():
                msg.member.addRoles( [alumniRole, privRole], Constants.Strings.ROLEREASON );
                sendWelcomeMessage( msg.member );
                break;
            case Constants.Strings.GUEST.toLowerCase():
                msg.member.addRoles( [guestRole, privRole], Constants.Strings.ROLEREASON );
                sendWelcomeMessage( msg.member );
                break;
        }

        clearTimeout( htNewMembers.get( msg.member.id ) );
        htNewMembers.remove( msg.member.id );
    } else if( part == 2 ) {
        if( htMembers.get( msg.author.id ) === undefined ) {
            msg.author.send( Constants.Strings.NOTCOMPLETEDPASTSTEP );
            return;
        }
        let from = Constants.Strings.FROMNAME + " <" +Constants.Strings.SENDER + "@" + domain + ">";
        let to = msg.content;
        let subject = Constants.Strings.SUBJECT;
        let code = generateRandom( 0, 999999 );
        htCodes.put( msg.author.id, code );
        let text = Constants.Strings.TEXT + code;
        sendEmail( mailgun, from, to, subject, text );
        msg.author.send( Constants.Strings.EMAILSENT );
    } else if( part == 3 ) {
        if( htMembers.get( msg.author.id ) === undefined || htCodes.get( msg.author.id ) === undefined ) {
            msg.author.send( Constants.Strings.NOTCOMPLETEDPASTSTEP );
            return;
        }
        let member = htMembers.get( msg.author.id );
        let guild = member.guild;
        let studentRole = exports.getRoleByNameGuild( guild, Constants.Strings.SCHOOLROLE );
        let privRole = exports.getRoleByNameGuild( guild, Constants.Strings.PRIVROLE );

        let codeToCompare = msg.content;
        if( +codeToCompare == htCodes.get( msg.author.id ) ) {
            msg.author.send( Constants.Strings.VERIFIED );
            member.addRoles( [studentRole, privRole], Constants.Strings.ROLEREASON );
            // clean hash table
            htMembers.remove( msg.author.id );
            htCodes.remove( msg.author.id );
            // send welcome message
            sendWelcomeMessage( member );
        } else {
            msg.author.send( Constants.Strings.WRONGCODE );
        }
    } else if( part == 4 ) {
        msg.channel.send( Constants.Strings.WRONGCHANNELWARN );
    }
}

/**
 * Takes a question and answers it with yes/no responses.
 * @param {string[]} arguments - The words of the argument to process.
 * @param {@link Message} msg - The message to process.
 */
exports.eightBallCommand = function( arguments, msg, client, prefix ) {
    let lastWord;
    let lastCharacter;
    if( arguments.length == 0 ) {
        Help.helpCommand( [Constants.Commands.EIGHTBALL], msg, false, client, prefix );
        return;
    } else if( arguments.length > 0 ) {
        lastWord = arguments[arguments.length-1];
        lastCharacter = lastWord.charAt( lastWord.length-1 );
    }

    if( lastCharacter != '?' ) {
        msg.channel.send( Constants.Strings.ASKQUESTION );
    } else {
        let random = generateRandom( 0, 9 );
        let eightBallString = Constants.eightBallResponses[random];
        msg.channel.send( eightBallString );
    }
}

/**
 * Takes two arguments and returns how much they love each other.
 * @param {string[]} arguments - The array of arguments to process.
 * @param {@link Message} - The message to process.
 */
exports.loveCommand = function( arguments, msg, client, prefix ) {
    let argumentsStr = arguments.join(" ");

    // this will preserve old behavior if no comma is found
    if( argumentsStr.includes(",") )
        arguments = argumentsStr.split(", ");

    if( arguments.length != 2 ) {
        Help.helpCommand( [Constants.Commands.LOVE], msg, false, client, prefix );
    } else {
        let lovePercentage = 0;
        for( let i = 0; i < arguments.length; i++ ) {
            let argument = arguments[i];
            for( let j = 0; j < argument.length; j++ ) {
                lovePercentage += argument.charCodeAt(j);
            }
        }
        lovePercentage = lovePercentage % 100;

        let self = false;
        if( arguments[0] == arguments[1] ) {
            lovePercentage = 100.0;
            self = true;
        }
        let first = arguments[0];
        let second = arguments[1];
        let lovesStr = first + Constants.Strings.LOVES + second + " " + lovePercentage + "%";
        if( self )
            lovesStr += " :heart:";

        let loveProgress = Math.floor(lovePercentage / 5);
        let progressBar = Constants.Strings.LOVELOADSTART;
        for( let i = 0; i < 20; i++ ) {
            if( i < loveProgress )
                progressBar += Constants.Strings.LOVELOAD;
            else
                progressBar += Constants.Strings.LOVENOLOAD;
        }
        progressBar += Constants.Strings.LOVELOADEND;

        msg.channel.send( lovesStr + "\n`" + progressBar + "`" );
    }
}

/**
 * Rolls x y-sided dice.
 * @param {string[]} arguments - The array of arguments to process.
 * @param {@link Message} msg - The message to process.
 */
exports.rollCommand = function( arguments, msg, client, prefix ) {
    if( !exports.isRunnable( msg ) )
        return;

    if( arguments.length > 3 ) {
        Help.helpCommand( [Constants.Commands.ROLL], msg, false, client, prefix );
    } else {
        // check that arguments are numbers
        for( let i = 0; i < arguments.length-1; i++ ) {
            let argument = arguments[i];
            argument = +argument;
            if( isNaN( argument ) ) {
                msg.channel.send( Constants.Strings.NOTALLNUMBERS );
                return;
            }
        }

        let rolls = [];
        let numDice = 1;
        let sides = 6;
        let details = false;
        if( arguments.length >= 1 ) {
            numDice = +arguments[0];
            if( numDice <= 0 ) {
                msg.channel.send( Constants.Strings.ALODICE );
                return;
            }
        }
        if( arguments.length >= 2 ) {
            sides = +arguments[1];
            if( sides <= 0 ) {
                msg.channel.send( Constants.Strings.ALOSIDE );
                return;
            }
        }
        if( arguments.length == 3 ) {
            if( arguments[2].toLowerCase() == Constants.Strings.YESRESPONSE ||
                arguments[2].toLowerCase() == Constants.Strings.TRUERESPONSE )
                details = true;
        }

        if( numDice > 100 ) {
            msg.channel.send( Constants.Strings.TOOMANYDICE );
            return;
        }
        for( let i = 0; i < numDice; i++ )
            rolls.push( generateRandom( 1, sides ) );

        let rollsStr = "";
        let sum = 0;
        for( let i = 0; i < rolls.length; i++ ) {
            let num = i + 1;
            sum += rolls[i];
            rollsStr += Constants.Strings.ROLL + num + Constants.Strings.ROLLEND + rolls[i] + "\n";
        }

        let average = sum/rolls.length;
        if( details ) {
            rollsStr += "\n" + Constants.Strings.AVERAGE + average + "\n";
            rollsStr += Constants.Strings.SUM + sum + "\n";
        }

        let embed = new RichEmbed()
            .setTitle(Constants.Strings.ROLLS)
            .setColor(0xFF0000)
            .setDescription( rollsStr );

        msg.channel.send( embed );
    }
}

exports.woofCommand = function( arguments, msg, breeds ) {
    let breed = arguments[0] ? arguments[0].toLowerCase() : breeds[Math.floor(Math.random()*breeds.length)];
    let url = `https://api.woofbot.io/v1/breeds/${breed}/image`;
    https.get( url, function(res) {
        res.on('data', function(data) {
            let woofData = JSON.parse( data );
            if( woofData.status == "success" )
                msg.channel.send( {
                    files: [
                        woofData.response.url
                    ]
                });
            else
                msg.channel.send( 'Invalid breed.' );
        });
    })
}

exports.executeCommand = async function( arguments, msg, execSync, client, prefix ) {
    if( arguments.length == 0 ) {
        Help.helpCommand( [Constants.Commands.EXECUTE], msg, false, client, prefix );
        return;
    }
    let message = await msg.channel.send( "Loading..." );
    let language = arguments[0].toLowerCase();
    let code = arguments.slice(1).join(" ");
    let outString = "";
    let command = "timeout 5s ";
    if( code.includes("```") ) {
        let parts = arguments.join(" ").split("\n");
        language = parts[0];
        code = parts.slice(2, parts.length-1).join("\n");
    }
    let filename = `temp/temp.${language}`
    if( !Constants.SupportedLanguagesArr.includes(language) ) {
        message.edit( "Language not supported." );
        return;
    }

    if( code.includes('import os') ) {
        message.edit( 'You may not import this package.' );
        return;
    }

    // java
    if( language == Constants.SupportedLanguages.JAVA ) {
        code = `package temp;
public class temp {
    public static void main( String[] args ) {
        ${code}
    }
}`.replace(/sopl/g, 'System.out.println');
    }

    fs.writeFile( filename, code, (err) => {
        if( err ) {
            msg.channel.send( "Error encountered: " + util.inspect(err) )
            return;
        }
        let output;
        outString += `Code:\n\`\`\`${language}\n${code}\n\`\`\``;
        if( language == Constants.SupportedLanguages.PYTHON ) {
            try {
                command += `python ${filename}`;
                outString += `Running: \`${command}\`\n`
                output = execSync( command );
            } catch (err) {
                output = err.stderr;
            }
        }
        else if( language == Constants.SupportedLanguages.JAVA ) {
            try {
                command += `javac ${filename} && timeout 5s java temp.temp`;
                outString += `Running: \`${command}\`\n`;
                output = execSync( command );
                execSync( `rm temp/temp.class` );
            } catch (err) {
                output = err.stderr;
            }
        }
        try {
            execSync( `rm ${filename}` );
        } catch (err) {
            output = err.stderr;
        }
        output = output.toString('utf8') ? output.toString('utf8') : "No output.";
        outString += "Output:\n```\n" + output + "\n```"
        message.edit( outString, {split: {char: "\n", prepend: `\`\`\`${language}`, append: "```"}} );
    })
}

exports.playCommand = function( arguments, msg, client, prefix ) {
    let voiceFiles = Help.getVoiceFiles();

    if( arguments.length != 1 ) {
        Help.helpCommand( [Constants.Commands.PLAY], msg, false, client, prefix );
        return;
    }
    if( msg.member.voiceChannel === undefined ) {
        msg.channel.send( Constants.Strings.NOTINVOICEWARN );
        return;
    }
    let voiceFileFound = false;
    for( let i = 0; i < voiceFiles.length; i++ ) {
        let voiceFile = voiceFiles[i];
        if( arguments[0] == voiceFile )
            voiceFileFound = true;
    }
    if( !voiceFileFound ) {
        msg.channel.send( Constants.Strings.VOICEFILENOTFOUNDWARN );
        return;
    }
    let vc = msg.member.voiceChannel;
    vc.join()
        .then( connection => {
            console.log( "Joined voice channel " + vc.name );
            connection.playFile( Constants.Strings.ABSOLUTEPATH + arguments[0] + Constants.Strings.MP3, {volume: 0.5} );
    });
    msg.react( Constants.Strings.CLAP );
}

exports.addSoundCommand = function( arguments, msg, htAccept, adding, client, prefix ) {
    if( arguments.length > 0 ) {
        Help.helpCommand( [Constants.Commands.ADDSOUND], msg, false, client, prefix );
    } else {
        let ranOnce = false;
        let warnFilename = false;
        let warnFilesize = false;
        msg.attachments.forEach(( attachment ) => {
            if( ranOnce )
                return;

            ranOnce = true;
            if( !attachment.filename.endsWith( ".mp3" ) )
                warnFilename = true;
            else if( attachment.filesize > 2500000 )
                warnFilesize = true;
            else {
                if( !exports.isManagedServer( msg.guild ) || msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) || adding ) {
                    let file = fs.createWriteStream( Constants.Strings.ABSOLUTEPATH + attachment.filename );
                    https.get( attachment.proxyURL, function( response ) {
                        response.pipe( file );
                    });
                    msg.react( Constants.Strings.THUMBSUP );
                } else {
                    msg.react( Constants.Strings.THINK );
                    let botoutputChannel = getChannelByName( msg, Constants.Strings.BOTOUTPUT );
                    let embed = new RichEmbed()
                        .setAuthor( Constants.Strings.EMSOUNDADD, client.user.displayAvatarURL )
                        .setTitle( msg.author.tag )
                        .setColor(0xFF0000)
                        .addField( Constants.Strings.EMSOUNDFILENAME, attachment.filename )
                        .setThumbnail( msg.author.displayAvatarURL )
                        .setFooter( Constants.Strings.TIMESTAMP + msg.createdAt );
                    botoutputChannel.send( embed )
                    .then( message => {
                        htAccept.put( message.id, msg );
                        message.react( Constants.Strings.THUMBSUP );
                        message.react( Constants.Strings.THUMBSDOWN );
                    });
                }
            }
        });
        if( !ranOnce || warnFilename || warnFilesize ) {
            msg.channel.send( Constants.Strings.NEEDATTACHMENTWARN );
            return;
        }
    }
}

exports.leaveCommand = function( arguments, msg ) {
    if( msg.guild.me.voiceChannel === undefined ) {
        msg.channel.send( Constants.Strings.NOTINVOICEMEWARN );
        return;
    }
    msg.guild.me.voiceChannel.leave();
    msg.react( Constants.Strings.WAVE );
}

/**
 * This is used to have the bot send whatever message you want to whatever channel in whatever server you want. Need access to the server running the bot for this.
 * @param {@link Client} client - The client for the discord bot.
 * @param {string} input - The message to be sent by the bot.
 * @param {string} inServer - The server to send the message in. The server name only need contain this string.
 * @param {string} inChannel - The channel in the server to send the message in. The channel name only need contain this string.
 */
exports.sendMessage = function( client, input, inServer, inChannel ) {
    if( inServer === undefined )
        inServer = Constants.Strings.DEFAULTMESSAGESERVER;
    let server = getServerByName( client, inServer, true );
    if( server === undefined ) {
        console.log( "server not found!" );
        return;
    }
    
    if( inChannel === undefined )
        inChannel = Constants.Strings.DEFAULTMESSAGECHANNEL;
    let channel = exports.getChannelByNameGuild( server, inChannel, true );
    if( channel === undefined ) {
        console.log( "channel not found!" )
        return;
    }

    channel.send( input );
}

/**
 * This command kicks a member and sends them a dm.
 * @param {@link GuildMember} member - The member to kick and send a dm to.
 */
exports.kickCommand = function( member ) {
    if( member.hasPermission( Constants.Permissions.ADMIN ) )
        return;

    member.user.send( Constants.Strings.TOOLONGVERIFY );
    member.kick( Constants.Strings.KICKAGREEMENTREASON );
}

exports.commandCommand = function( arguments, msg, mysql, database, prefix, client, EmojiConvertor ) {
    console.log( "arguments received: " + arguments.toString() );
    if( arguments.length == 0 ) {
        Help.helpCommand( [Constants.Commands.COMMAND], msg, false, client, prefix );
        return;
    }
    switch( arguments[0] ) {
        case "add":
            exports.addCmdCommand( arguments.slice(1), msg, mysql, database, client, EmojiConvertor );
            break;
        case "delete":
            exports.deleteCommand( arguments.slice(1), msg, database );
            break;
        case "list":
            exports.listCustomCommands( arguments.slice(1), msg, database, prefix );
            break;
        case "detail":
            exports.detailCommand( arguments.slice(1), msg, database, client );
            break;
        default:
            msg.channel.send( Constants.Strings.COMMANDINSTRUCTION );
    }
}

/**
 * This command adds custom commands to the server.
 * @param {string[]} arguments - The arguments supplied. Should contain the command to be added.
 * @param {Message} msg - The message to be procesed.
 */
exports.addCmdCommand = async function( arguments, msg, mysql, database, client, EmojiConvertor ) {
    if( !exports.isRunnable( msg ) )
        return;

    if( arguments.length <= 1 )
        msg.channel.send( Constants.Strings.ADDCOMMANDINSTRUCTION );
    else {
        for( let i = 0; i < Constants.CommandsArray.length; i++ ) {
            let command = Constants.CommandsArray[i];
            if( command == arguments[0] ) {
                msg.channel.send( Constants.Strings.SAMEASBUILTIN );
                return;
            }
        }

        // create local variables corresponding to column names
        let name = arguments[0].toLowerCase();
        let message = arguments.slice(1).join(" ");
        let made_by = msg.author.id;
        let timestamp = new Date();
        let server_id = msg.guild.id;
        let server_name = msg.guild.name;
        let request_id = !exports.isManagedServer( msg.guild ) || msg.member.hasPermission( Constants.Permissions.KICKMEMBERS );

        if( !request_id ) {
            let auditChannel = getChannelByName( msg, Constants.Strings.BOTOUTPUT );
            let embed = new RichEmbed()
                .setAuthor( Constants.Strings.EMCOMMANDADD, client.user.displayAvatarURL )
                .setTitle( msg.author.tag )
                .setColor(0xFF0000)
                .addField( Constants.Strings.EMCOMMANDNAME, name )
                .addField( Constants.Strings.EMCOMMANDMSG, message )
                .setThumbnail( msg.author.displayAvatarURL )
                .setFooter( Constants.Strings.TIMESTAMP + msg.createdAt );
            let approvalMessage = await auditChannel.send( embed );
            approvalMessage.react( Constants.Strings.THUMBSUP );
            approvalMessage.react( Constants.Strings.THUMBSDOWN );
            request_id = approvalMessage.id;
        } else
            request_id = 0;
        // check for duplicate command
        let checkDupeQuery = `SELECT name FROM commands WHERE name='${name}' AND server_id='${server_id}'`;
        if( DEBUG )
            console.log( "built query: " + checkDupeQuery );
        database.query( checkDupeQuery, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            if( results.length > 0 )
                msg.channel.send( Constants.Strings.DUPECOMMANDWARN );
            else {
                message = EmojiConvertor.replace_unified( message );
                // perform insertion, after check executes use connection.escapeId to clean user input
                let query = mysql.format(
                    "INSERT INTO commands VALUES (?,?,?,?,?,?);",
                    [name, message, made_by, null, server_id, request_id]
                );
                if( DEBUG )
                    console.log( "built query: " + query );
                database.query( query, function( err, results ) { if( exports.errHandler( err, msg ) ) return; });
                msg.react( request_id == 0 ? Constants.Strings.THUMBSUP : Constants.Strings.THINK );
            }
        });
    }
}

/**
 * This command is used to delete custom commands.
 * @param {string[]} arguments - The arguments supplied. Should contain the command to be deleted.
 * @param {Message} msg - The message to be procesed.
 */
exports.deleteCommand = function( arguments, msg, database ) {
    if( !exports.isRunnable( msg ) )
        return;
    
    if( arguments.length == 0 || arguments.length > 1 )
        msg.channel.send( Constants.Strings.DELETECOMMANDINSTRUCTION );
    else {
        let name = arguments[0].toLowerCase();
        for( let i = 0; i < Constants.CommandsArray.length; i++ ) {
            let command = Constants.CommandsArray[i];
            if( command == name ) {
                msg.channel.send( Constants.Strings.SAMEASBUILTINDELETE );
                return;
            }
        }
        let server_id = msg.guild.id;
        
        let checkDupeQuery = `SELECT * FROM commands WHERE name='${name}' AND server_id='${server_id}'`;
        if( DEBUG )
            console.log( "built query: " + checkDupeQuery );
        database.query( checkDupeQuery, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            if( results.length == 0 ) {
                msg.channel.send( Constants.Strings.NOCOMMANDFOUND );
                return;
            }

            if( results[0].made_by != msg.author.id && !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) && exports.isManagedServer( msg.guild ) ) {
                msg.channel.send( Constants.Strings.NOTYOURCOMMANDWARN );
                return;
            }
            let query = `DELETE FROM commands WHERE name='${name}' AND server_id='${server_id}'`;
            if( DEBUG )
                console.log( "built query: " + query );
            database.query( query, function( err, results ) { if( exports.errHandler( err, msg ) ) return; });
            msg.react( Constants.Strings.THUMBSUP );
        });

    }
}

/**
 * Used to list the custom commands in a server.
 * @param {string[]} arguments - The arguments supplied to this command. These are not read.
 * @param {Message} msg - The message to be processed.
 * @param {HashTable} htGuildCommandsList - A hash table containg arrays of commands. Key is guild.id.
 */
exports.listCustomCommands = function( arguments, msg, database, prefix ) {
    if( !exports.isRunnable( msg ) )
        return;
    let query = `SELECT name FROM commands WHERE server_id=${msg.guild.id} AND request_id=0`;
    if( arguments[0] )
        query += ` AND name LIKE '%${arguments[0]}%'`;
    if( DEBUG )
        console.log( "built query: " + query );
    let commandArr = [];
    database.query( query, function( err, results ) {
        if( exports.errHandler( err, msg ) ) return;
        results.forEach(( result ) => {
            commandArr.push( result.name );
        })
        if( commandArr === undefined || commandArr.length == 0 ) {
            msg.channel.send( Constants.Strings.NOCUSTOMCOMMANDSWARNING );
            return;
        }

        let embed = Help.arrToEmbedHelp( commandArr, null, prefix );
        msg.channel.send( embed );
    });
}

exports.detailCommand = function( arguments, msg, database, client ) {
    // intentionally has no restriction
    let query = `SELECT * FROM commands WHERE server_id=${msg.guild.id} AND request_id=0`;
    if( arguments[0] )
        query += ` AND name='${arguments[0]}'`;
    else {
        msg.channel.send(Constants.Commands.COMMANDINSTRUCTION);
        return;
    }
    if( DEBUG )
        console.log( "built query: " + query );
    database.query( query, function( err, results ) {
        if( exports.errHandler( err, msg ) ) return;
        if( results.length == 0 ) {
            msg.channel.send( Constants.Strings.NOCOMMANDFOUND );
            return;
        }
        let embed = new RichEmbed()
            .setAuthor(`Command details:`, client.user.displayAvatarURL )
            .setTitle(`Name: ${results[0].name}`)
            .setColor(0xFF0000)
            .addField( `Contents:`, results[0].message )
            .addField( `Creator:`, msg.guild.member( results[0].made_by ) )
            .addField( `Generated at:`, results[0].timestamp)
            .setThumbnail( `${(msg.guild.member( results[0].made_by)).user.displayAvatarURL}` )
            .setFooter( client.user.tag, client.user.displayAvatarURL );
        msg.channel.send( embed );
    });
}

/**
 * This command gives all members with Rutgers Student, Alumni, or Guest roles but no permissions role the permissions role. This command is meant to be used to convert legacy Rutgers Esports Discord to "neo" Rutgers Esports Discord.
 * @param {string[]} arguments - The arguments supplied to this command. These are not needed.
 * @param {@link Message} - The message to be processed. Will be used to read guild and give roles to members in the guild attached to this message.
 */
exports.givePermsAllCommand = function( arguments, msg ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    // checks to make sure this command runs as intended
    if( !msg.member.hasPermission( Constants.Permissions.ADMIN, false, true ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( allPermsGiven ) {
        console.log( msg.author.tag + " tried to run this command more than once. Please yell at them." );
        msg.channel.send( Constants.Strings.COMMANDALREADYRUN );
        return;
    }

    membersWithPrivRoles = [];
    msg.guild.members.forEach(( member ) => {
        if( hasStudentAlumniGuest( member ) ) {
            membersWithPrivRoles.push( member );
        }
    });

    let memberNames = [];
    membersWithPrivRoles.forEach(( member ) => {
        member.addRole( getRoleByName( msg, Constants.Strings.PRIVROLE ) );
        memberNames.push( member.user.tag );
    });

    msg.channel.send( "Members have been given permissions role. Check the log for more details." );
    console.log( "Members given permissions role: " + memberNames );

    allPermsGiven = true;
}

/**
 * Used to save quotes for a user.
 * @param {string[]} arguments - The arguments supplied to this command. Should contain a mention.
 * @param {@link Message} msg - The message to be processed.
 */
exports.quoteCommand = function( arguments, msg, client, mysql, database, prefix ) {
    if( arguments.length == 1 ) {
        let mentions = msg.mentions.members;
        if( mentions === undefined ) {
            msg.channel.send( Constants.Strings.QUOTEMENTION )
            return;
        }
        let member;
        mentions.forEach(( memberI ) => {
            member = memberI;
        });
        if( member === undefined ) {
            msg.channel.send( Constants.Strings.NOTVALIDMEMBER );
            return;
        }
        if( member == msg.member ) {
            msg.channel.send( Constants.Strings.CANNOTQUOTESELF );
            return;
        }
        let lastMessage = member.lastMessage;
        
        if( lastMessage === undefined || lastMessage == null ) {
            msg.channel.send( Constants.Strings.NOLASTMESSAGE )
            return;
        }

        // insert quote into database
        let query = mysql.format(
            `INSERT INTO quotes VALUES ( ?,?,? );`,
            [ lastMessage.cleanContent, member.user.id, null ]
        );
        database.query( query, function( err, results ) {
            if( exports.errHandler(err,msg) ) return;
            msg.channel.send( Constants.Strings.QUOTEADDSUCCESS + member.user.tag );
        });
    } else {
        Help.helpCommand( [Constants.Commands.QUOTE], msg, false, client, prefix );
    }
}

/**
 * Used to list saved quotes for a user.
 * @param {string[]} arguments - The arguments supplied to this command. Might contain a mention.
 * @param {@link Message} msg - The message to be processed.
 */
exports.quotesCommand = function( arguments, msg, database, client, prefix ) {
    if( arguments.length == 0 || arguments.length == 1 ) {
        let mentions = msg.mentions.members;
        let member;
        mentions.forEach(( memberI ) => {
            member = memberI;
        });
        if( !member )
            member = msg.guild.member( arguments[0] );
        let outStr = "";
        let embed = new RichEmbed()
            .setAuthor(`Quotes:`, client.user.displayAvatarURL )
            .setTitle(`User: ${member.user.tag}`)
            .setColor(0xFF0000)
            .setThumbnail( `${member.user.displayAvatarURL}` )
            .setFooter( client.user.tag, client.user.displayAvatarURL );
        let query = `SELECT message FROM quotes WHERE user=${member.user.id}`;
        if( DEBUG )
            console.log( "built query: " + query );
        database.query( query, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            for( let i = 0; i < results.length; i++ )
                embed.addField( `Quote ${i+1}:`, results[i].message );
            msg.channel.send( embed.fields.length == 0 ? "User has no quotes." : embed );
        })
    } else {
        Help.helpCommand( [Constants.Commands.QUOTES], msg, false, client, prefix );
    }
}

exports.queryCommand = function( arguments, msg, database, client, prefix ) {
    if( !msg.member.hasPermission( Constants.Permissions.ADMIN ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments.length == 0 )
    Help.helpCommand( [Constants.Commands.QUERY], msg, false, client, prefix );
    else {
        let query = arguments.join(" ");

        if( query.includes( "drop" || "delete" ) ) {
            msg.channel.send( "I'd prefer if you didn't try to delete things using this interface." );
            return;
        }

        database.query( query, function( err, results, fields ) {
            if( exports.errHandler( err, msg ) ) return;
            let retStr = "";
            if( results.length > 0 ) {
                results.forEach(( result ) => {
                    retStr += "\n" + util.inspect( result );
                });
            }

            msg.channel.send( retStr != "" ? retStr : "No rows returned.", {code: "js",split: true} );
        });
    }
}

exports.filterCommand = function( arguments, msg, filterWords, client, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments[0] == "add" ) {
        arguments = arguments.slice( 1 );
        if( arguments.length < 2 || arguments.length > 3 ) {
            Help.helpCommand( [Constants.Commands.FILTER], msg, false, client, prefix );
        } else {
            filterWords.push( arguments[0] );
            let argsForUnfilter = [];
            argsForUnfilter.push( arguments[0] );
            arguments = arguments.slice( 1, arguments.length )
            let timeArr = timeStringToArr( arguments );
            // time string check
            if( timeArr[0] == "error" ) {
                msg.channel.send( Constants.Strings.INVALIDTIMESTRING );
                return;
            }
            let weeks = timeArr[0];
            let days = timeArr[1];
            let hours = timeArr[2];
            let minutes = timeArr[3];
            let seconds = timeArr[4];
            
            let milliseconds = calcMilliseconds( weeks, days, hours, minutes, seconds );
            let time = setTimeout( exports.unfilterCommand, milliseconds, argsForUnfilter, msg, filterWords );
            htFilteredWords.put( argsForUnfilter[0], time );
            let durationString = buildDurationString( weeks, days, hours, minutes, seconds );

            msg.channel.send( Constants.Strings.FILTERADDED + argsForUnfilter[0] + Constants.Strings.DURATION + durationString );
        }
    } else if( arguments[0] == "remove" ) {
        arguments = arguments.slice( 1 );
        exports.unfilterCommand( arguments, msg, filterWords, client, prefix )
    } else if( arguments[0] == "list" ) {
        arguments = arguments.slice( 1 );
        exports.filtersCommand( arguments, msg, filterWords, client, prefix );
    } else
        Help.helpCommand( [Constants.Commands.FILTER], msg, false, client, prefix );
}

exports.unfilterCommand = function( arguments, msg, filterWords, client, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }
    
    if( arguments.length != 1 )
        Help.helpCommand( [Constants.Commands.FILTER], msg, false, client, prefix );
    else {
        let wordFound = false;
        for( let i = 0; i < filterWords.length; i++ ) {
            if( filterWords[i] == arguments[0] )
                wordFound = true;
        }
        if( !wordFound ) {
            msg.channel.send( Constants.Strings.WORDNOTFOUNDWARN );
            return;
        }

        filterWords = filterWords.filter( word => word != arguments[0] );

        let timer = htFilteredWords.get( arguments[0] );
        clearTimeout( timer );

        msg.channel.send( Constants.Strings.FILTERREMOVED + arguments[0] );
    }
}

exports.filtersCommand = function( arguments, msg, filterWords, client, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }
    
    let retString = "";
    for( let i = 0; i < filterWords.length; i++ ) {
        let filterWord = filterWords[i];
        retString += filterWord + "\n";
    }
    let embed = new RichEmbed()
        .setTitle(Constants.Strings.EMFILTERS)
        .setColor(0xFF0000)
        .setDescription( retString );

    if( retString == "" ) {
        msg.channel.send( Constants.Strings.NOFILTERSWARN );
        return;
    }

    msg.channel.send( embed );
}

exports.warnCommand = function( arguments, msg, client, mysql, database, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( !(arguments.length >= 2 && arguments.length <= 3) )
        Help.helpCommand( [Constants.Commands.WARN], msg, false, client, prefix );
    else {
        arguments[0] = arguments[0].split(" ").splice(1);
        let messageID = arguments[0];
        let ruleNumbers = arguments[1].split(" ");
        let notes = arguments[2];
        let rulesCount = 0;
        let rulesTexts = [];

        msg.delete();

        // report-generating and message deletion block
        msg.channel.fetchMessage(messageID).then(messagea => {
            // save words from message
            messageContent = messagea.cleanContent;

            // find audit channel
            let auditChannel = getChannelByName( msg, Constants.Strings.AUDIT );

            query = `SELECT message_id FROM userwarnings WHERE server=${msg.guild.id} AND message_id=${messagea.id}`;
			if( DEBUG )
				console.log( "built query: " + query );
            database.query( query, function( err, results ) {
                if( exports.errHandler( err, msg ) ) return;
                if( results.length > 0 ) {
                    msg.channel.send( Constants.Strings.ALREADYWARNED );
                    return;
                }
                let user_id = msg.author.id;
                // message already set as messageContent
                let ruleNumber = ruleNumbers.join(" ");
                let channel = msg.channel.id;
                let server = msg.guild.id;
                let message_id = messagea.id;
                // notes set as notes

                // fetch rule text
                query = `SELECT text FROM rules WHERE number=${ruleNumbers[0]}`;
                ruleNumbers.slice(1).forEach(( ruleNumber ) => { query += ` OR ${ruleNumber}`});
                if( DEBUG )
                    console.log( "built query: " + query );
                database.query( query, function( err, results ) {
                    if( exports.errHandler( err, msg ) ) return;
                    if( results.length == 0 ) {
                        msg.author.send( Constants.Strings.NOTVALIDRULE );
                        return;
                    }
                    results.forEach(( result ) => {
                        rulesTexts.push(result.text);
                    });
                    
                    // DM user regarding infraction
                    let dmText = Constants.Strings.WARNINGMESSAGE + "\n\n**__Details:__**\n__Rule(s) Broken:__\n";
                    for( let i = 0; i < ruleNumbers.length; i++ ) {
                        let ruleNumber = ruleNumbers[i];
                        dmText += "**Rule #" + ruleNumber + ":** " + rulesTexts[ruleNumber-1] + "\n";
                    }
                    dmText += Constants.Strings.OFFENDINGMESSAGE + messageContent + "\n__Channel:__ #" + messagea.channel.name;
                    if( notes )
                        dmText += "\n__Notes:__ " + notes;
                    dmText += "\n\n" + Constants.Strings.WARNDISCLAIMER;

                    messagea.author.send( dmText );

                    auditChannel.send(`**Warned Member by ${msg.member}:**`);
                    // delete message and send the report to the audit channel
                    messagea.delete();

                    // add to table
                    query = mysql.format(
                        "INSERT INTO userwarnings VALUES (?,?,?,?,?,?,?,?);",
                        [user_id,messageContent,ruleNumber,null,channel,server,message_id,notes]
                    );
                    if( DEBUG )
                        console.log( "built query: " + query );
                    database.query( query, function(err,results) { if( exports.errHandler( err, msg ) ) return; });

                    return;
                });
            });
        })
        .catch( console.error );
    }
}

exports.warnsCommand = function( arguments, msg, database, client, prefix ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments.length < 1 )
        Help.helpCommand( [Constants.Commands.WARNS], msg, false, client, prefix );
    else {
        let user;
        msg.mentions.users.forEach(( member ) => {
            user = member;
        });
        // try get by snowflake
        if( !user )
            user = msg.member.guild.member( arguments[0] );
        
        // get the offending messages from the database
        let messageArr = [];
        let rulesTexts = [];
        let query = `SELECT * FROM userwarnings WHERE user_id=${user.id}`;
        if( arguments[1] )
            query += ` AND message LIKE '%${arguments[1]}%'`
        if( DEBUG )
            console.log( "built query: " + query );
        database.query( query, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;

            if( results.length == 0 ) {
                msg.channel.send( Constants.Strings.NOWARNEDMESSAGES );
                return;
            }

            results.forEach(( result ) => {
                messageArr.push( result );
            });

            query = `SELECT text FROM rules`;
            if( DEBUG )
				console.log( "built query: " + query );
            database.query( query, function( err, results ) {
                if( exports.errHandler( err, msg ) ) return;
                if( results.length == 0 ) {
                    msg.author.send( Constants.Strings.NOTVALIDRULE );
                    return;
                }
        
                results.forEach(( result ) => {
                    rulesTexts.push(result.text);
                });
                // output the offending messages
                let outStr = "**___Details:___**\n";
                for( let i = 0; i < messageArr.length; i++ ) {
                    let message = messageArr[i];
                    outStr += "**__Offending message " + (i+1) + ":__**\n__Rule(s) Broken:__\n";
                    message.rule_numbers.split(" ").forEach(( ruleNumber ) => {
                        outStr += "**Rule #" + ruleNumber + ":** " + rulesTexts[ruleNumber-1] + "\n";
                    });
                    let channel;
                    msg.guild.channels.forEach(( channelI ) => {
                        if( channelI.id == message.channel )
                            channel = channelI;
                    })
                    outStr += Constants.Strings.OFFENDINGMESSAGE + message.message + "\n__Channel:__ " + channel;
                    if( message.notes )
                        outStr += "\n__Notes:__ " + message.notes;
                    outStr += "\n\n";
                }
    
                msg.channel.send( outStr, {split:true} );
            });
        });
    }
}

exports.echoCommand = function( arguments, msg ) {
    let channel = getChannelByName( msg, arguments[0] );
    if( !channel ) {
        let channelStr = arguments[0];
        channel = getChannelByName( msg, arguments[0].substring(1) );
    }
    if( !channel )
        msg.channel.send( Constants.Strings.CHANNELNOTFOUND );
    else
        channel.send( arguments.slice(1).join(" ") );
}

exports.nickCommand = function( arguments, msg ) {
    let me = msg.guild.me;
    let newNick;
    if( arguments.length > 0 )
        newNick = arguments.join(" ");
    else
        newNick = "";
    me.setNickname( newNick )
    .then( msg.react( Constants.Strings.THUMBSUP ) )
    .catch( console.error );
}

/**
 * This command is meant to be used to kick members that have no role from the server and clean #agreement of messages that were sent while the bot was running. These functions are planned to be split.
 * @param arguments - The arguments supplied to this command. Should just be TRUE if the command is meant to be run.
 * @param msg - The message to be processed. The {@link Guild} attached to this {@link Message} will be purged.
 */
exports.purgeCommand = function( arguments, msg ) {
    if( !exports.isManagedServer( msg.guild ) ) {
        msg.channel.send( Constants.Strings.NOTMANAGEDSERVERWARN );
        return;
    }

    if( !msg.member.hasPermission( Constants.Permissions.ADMIN ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments.length == 0 || arguments.length > 1 ) {
        msg.channel.send( Constants.Strings.PURGEWARNING );
    } else if( arguments[0] == Constants.Strings.PURGEARG ) {
        let guildToPurge = msg.guild;
        let membersKicked = [];
        let agreeChannel = getChannelByName( msg, Constants.Strings.AGREEMENT );
        guildToPurge.members.forEach(( member ) => {
            if( member.roles.size == 1 ) {
                membersKicked.push( member.user.tag )
                member.kick( Constants.Strings.PURGEKICKREASON );
            }
        });
        if( membersKicked.length > 0 ) {
            msg.channel.send( Constants.Strings.MEMBERSPURGED );
            console.log( "Members purged: " + membersKicked.join(", ") );
        }
        else if( membersKicked.length == 0 )
            msg.channel.send( Constants.Strings.NOMEMBERSPURGED );

        agreeChannel.fetchMessages()
        .then( messages => 
                messages.forEach(( message ) => {
                    if( message.author.id != Constants.Strings.RUTGERSESPORTS )
                        message.delete();
                })
            )
        .catch( console.error );
    } else {
        msg.channel.send( Constants.Strings.PURGEWARNING );
    }
}

exports.settingsCommand = function( arguments, msg, database, client, prefix, htSettings ) {
    let place;
    let name;
    let options;
    let query;
    if( msg.member.hasPermission( Constants.Permissions.ADMIN ) ) {
        place = arguments[0];
        if( place == "server" || place == "user" ) {
            name = arguments[1];
            options = arguments[2];
        } else {
            place = "user";
            name = arguments[0];
            options = arguments[1];
        }
    } else {
        place = "user";
        name = arguments[0];
        options = arguments[1];
    }

    if( arguments.length == 0 ) {
        let embed = new RichEmbed()
            .setTitle("Available settings:")
            .setDescription(`These settings can be set with ${prefix}settings name options. Entries can be reset to default with the \`clear\` option.`)
            .setColor(0xFF0000)
        if( Constants.SettingsArr.length != Constants.SettingsArrOptions.length ) throw "SettingsArr and SettingsArrOptions not same size";
        for( let i = 0; i < Constants.SettingsArr.length; i++ ) {
            let iterableName = Constants.SettingsArr[i];
            let iterableOptions = Constants.SettingsArrOptions[i];
            embed.addField( iterableName, iterableOptions );
        }
        embed.addField('[any command name]','on/off');
        msg.channel.send( embed );
    } else if( arguments.length == 1 ) {
        if( place == "user" || place == "server" )
            place = arguments[0];
        else {
            Help.helpCommand( [Constants.Commands.SETTINGS], msg, false, client, prefix );
            return;
        }
        let embed = new RichEmbed()
            .setColor(0xFF0000)
            .setFooter( client.user.tag, client.user.displayAvatarURL );
        if( arguments[0] == "user" ) {
                embed.setAuthor(`Settings for ${arguments[0]}:`, client.user.displayAvatarURL )
                .setTitle( msg.author.tag )
                .setThumbnail( msg.author.displayAvatarURL );
            query = `SELECT * FROM settings WHERE user=${msg.author.id}`;
        }
        else if( arguments[0] == "server" ) {
            embed.setAuthor(`Settings for ${arguments[0]}:`, client.user.displayAvatarURL )
            .setTitle( msg.guild.name )
            .setThumbnail( msg.guild.iconURL );
            query = `SELECT * FROM settings WHERE server=${msg.guild.id} AND user IS NULL`;
        }
        else {
            Help.helpCommand( [Constants.Commands.SETTINGS], msg, false, client, prefix );
            return;
        }
        if( DEBUG )
            console.log( "built query: " + query );
        database.query( query, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            Constants.SettingsArr.forEach(( setting ) => {
                let result = results.find(function(result) {
                    return result.name == setting;
                })
                if( result )
                    embed.addField( `${result.name}:`, result.options );
            })
            Constants.SettingsArr.forEach(( setting ) => {
                let hasField = false;
                embed.fields.forEach(( field ) => {
                    if( field.name == `${setting}:` )
                        hasField = true;
                })
                if( !hasField ) {
                    let option = htSettings.get( place + " " + setting );
                    if( typeof option == "boolean" )
                        embed.addField( `${setting}:`, option ? "on" : "off" );
                    else if( typeof option != "undefined" )
                        embed.addField( `${setting}:`, option ? option : Constants.Strings.PREFIX );
                }
            })
            msg.channel.send( embed );
        });
    } else {
        if( !Constants.SettingsArr.includes(name) && !Constants.CommandsArray.includes(name) ) {
            exports.settingsCommand( [], msg, database, client, prefix );
            return;
        }
        if( Constants.CommandsArray.includes(name) )
            name = "command: " + name;
        query = `SELECT * FROM settings WHERE name='${name}' `;
        query += place == "server" ? `AND server=${msg.guild.id}` : `AND user=${msg.author.id}`;
        if( place=="user" && (Constants.ServerOnlySettings.includes(name) || name.includes("command: ")) ) {
            msg.channel.send( Constants.Strings.SERVERONLYSETTING );
            return;
        }
        if( DEBUG )
            console.log( "Built query: " + query );
        database.query( query, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            if( results.length == 0 ) {
                query = `INSERT INTO settings VALUES ( '${name}', '${options}', `;
                query += place == "server" ? `${msg.guild.id}, null` : `${msg.guild.id}, ${msg.author.id}`;
                query += " );";
                if( DEBUG )
                    console.log( "Built query: " + query );
                database.query( query, function( err, results ) { if( exports.errHandler( err, msg ) ) return; });
            } else {
                if( options != "clear" ) {
                    query = `UPDATE settings SET options='${options}' WHERE name='${name}' `;
                    query += place == "server" ? `AND server=${msg.guild.id}` : `AND user=${msg.author.id}`;
                    if( DEBUG )
                        console.log( "Built query: " + query );
                    database.query( query, function( err, results ) { if( exports.errHandler( err, msg ) ) return; });
                } else {
                    query = `DELETE FROM settings WHERE name='${name}' `;
                    query += place == "server" ? `AND server=${msg.guild.id}` : `AND user=${msg.author.id}`;
                    if( DEBUG )
                        console.log( "Built query: " + query );
                    database.query( query, function( err, results ) { if( exports.errHandler( err, msg ) ) return; });
                }
            }
        });
        let retStr;
        if( options != "clear" )
            retStr = `Updated setting \`${name}\` with option \`${options}\``;
        else
            retStr = `Cleared setting \`${name}\``;
        retStr += place == "server" ? ` for ${msg.guild.name}.` : ` for ${msg.member}.`;
        msg.channel.send( retStr );
    }
}

exports.updaterulesCommand = function( arguments, msg, mysql, database ) {
    if( !msg.member.hasPermission( Constants.Permissions.ADMIN ) ) {
        msg.react( Constants.Strings.EYEROLL );
        return;
    }

    if( arguments.length < 2 )
        Help.helpCommand( [Constants.Commands.UPDATERULES], msg, false, client, prefix );
    else {
        let rule_number = arguments[0];
        let rule_text = arguments.slice(1).join(" ");
        let query = `SELECT * FROM rules`;
        if( DEBUG )
            console.log( "Built query: " + query );
        database.query( query, function( err, results ) {
            if( exports.errHandler( err, msg ) ) return;
            let rule_count = results.length;
            if( +rule_number > rule_count ) {
                query = mysql.format(`INSERT INTO rules VALUES (?,?,?)`,[+rule_number,rule_text,null]);
                if( DEBUG )
                    console.log( "Built query: " + query );
                database.query( query, function( err ) { if( exports.errHandler( err, msg ) ) return; });
            } else {
                query = `UPDATE rules SET text='${rule_text}' WHERE number=${rule_number}`;
                if( DEBUG )
                    console.log( "Built query: " + query );
                database.query( query, function( err ) { if( exports.errHandler( err, msg ) ) return; });
            }
            msg.react( Constants.Strings.THUMBSUP );
        });
    }
}

/**
 * Tells the server who the bot is.
 * @param {string[]} arguments - The arguments supplied to this command. Will be ignored.
 * @param {@link Message} msg - The message to be processed.
 */
exports.whoamiCommand = function( arguments, msg, client ) {
    let red = msg.guild;
    let embed = new RichEmbed()
        .setAuthor(Constants.Strings.WHOAMIAUTHOR, client.user.displayAvatarURL )
        .setTitle(`I'm ${client.user.username}!`)
        .setDescription( Constants.Strings.WHOAMIDESCRIPTION )
        .setColor(0xFF0000)
        .addField( Constants.Strings.PROGRAMMER, Constants.Strings.PROGRAMMERDESCRIPTION );

    let creditsField = "API for woof command by ";
    if( msg.guild.member( Constants.Strings.JOEYID ) )
        creditsField += msg.guild.member(Constants.Strings.JOEYID)
    else
        creditsField += Constants.Strings.JOEYTAG;
    creditsField += " hosted at https://woofbot.io/";
    
    embed.addField( "Thanks!", creditsField )
        .addField( Constants.Strings.SERVERSTATS, Constants.Strings.MEMBERCOUNT + red.memberCount.toString() )
        .setThumbnail( client.user.displayAvatarURL )
        .setFooter( client.user.tag, client.user.displayAvatarURL );
    
    msg.channel.send( embed );
}

/**
 * This function is a command that is called upon reading a command that is not predefined. It sends a message back to the same channel saying it didn't understand the command.
 * @param {@link Message} msg - The message object that is being processed.
 */
exports.fallbackCommand = function( msg ) {
    msg.channel.send( Constants.Strings.FALLBACK );
}

exports.mute = function( member, muteTime ) {
    let clientMember = member.guild.me;
    let arguments = [ member.id, muteTime ];
    exports.muteCommand( arguments, clientMember.lastMessage )
}

exports.isManagedServer = function( guild ) {
    let isManagedServer = false;
    for( let i = 0; i < Constants.ManagedServers.length; i++ ) {
        let serverId = Constants.ManagedServers[i];
        if( guild.id == serverId )
            isManagedServer = true;
    }
    return isManagedServer;
}

exports.pickPrefix = function( settings, receivedMessage, serverOnly ) {
	let prefix = settings.find(function(setting) {
		if( setting.name == Constants.Settings.PREFIX && setting.user == receivedMessage.author.id )
            return setting;
    });
	if( serverOnly || !prefix ) {
		prefix = settings.find(function(setting) {
			if( setting.name == Constants.Settings.PREFIX && setting.server == receivedMessage.guild.id && setting.user == null )
				return setting;
		})
    }
    if( prefix )
        prefix = prefix.options;
    else
        prefix = Constants.Strings.PREFIX;

	return prefix;
}


function buildDurationString( weeks, days, hours, minutes, seconds ) {
    let durationString = "";
    if( weeks != 0 )
        durationString += weeks + " weeks ";
    if( days != 0 )
        durationString += days + " days ";
    if( hours != 0 )
        durationString += hours + " hours ";
    if( minutes != 0 )
        durationString += minutes + " minutes ";
    if( seconds != 0 )
        durationString += seconds + " seconds ";
    durationString = durationString.slice( 0, durationString.length - 1 ) + ".";
    return durationString;
}

function timeStringToArr( args ) {
    let timeArr = [];
    let weeks = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    for( let i = 0; i < args.length; i++ ) {
        let arg = args[i];
        //check if this is the weeks argument
        let lastChar = arg[arg.length - 1].toLowerCase();
        switch( lastChar ) {
            case 'w':
                weeks = arg.slice( 0, arg.length - 1 );
                continue;
            case 'd':
                days = arg.slice( 0, arg.length-1 );
                continue;
            case 'h':
                hours = arg.slice( 0, arg.length - 1 );
                continue;
            case 'm':
                minutes = arg.slice( 0, arg.length - 1 );
                continue;
            case 's':
                seconds = arg.slice( 0, arg.length - 1 );
                continue;
            default:
                return ["error"];
        }
    }
    if( weeks !== undefined && days !== undefined && hours !== undefined && minutes !== undefined && seconds !== undefined ) {
        timeArr.push( weeks, days, hours, minutes, seconds );
        return timeArr;
    }
    return ["error"];
}

exports.getSettings = function( msg, nm, messageReaction, user, eventType, database, client ) {
    let query = `SELECT * FROM settings`;
    if( DEBUG )
        console.log( "built query: " + query );
    database.query( query, function( err, results ) {
        if( exports.errHandler( err, msg ) ) return;
        let htSettings = new HashTable();
        let settings = results.slice(0);
        let prefix = exports.pickPrefix( settings, msg, false );
        let serverPrefix = exports.pickPrefix( settings, msg, true );
        ////// GET SERVER ONLY SETTINGS
        let settingsTemp = settings.slice(0);
        settings = [];
        settingsTemp.forEach(( setting ) => {
            if( setting.server == msg.guild.id )
                settings.push( setting );
        });
        //////// CHAIN SETTING PARSE
        let isChain = settings.find(function(setting) { return setting.name == Constants.Settings.ISCHAIN } );
        isChain = isChain ? isChain.options : "on";
        isChain = isChain != "off";
        //////// DISABLED COMMAND SETTING PARSE
        let disabledCommands = [];
        settings.forEach(( setting ) => {
            if( setting.name.includes("command: ") && setting.options == "off" )
                disabledCommands.push(setting.name.split(" ")[1]);
        });
        //////// LOG SETTING PARSE
        let isLog = settings.find(function(setting) {
            if( setting.name == Constants.Settings.ISLOG && setting.server == msg.guild.id )
                return setting.options;
        });
        let log = exports.isManagedServer( msg.guild );
        if( isLog ) {
            if( isLog.options == "on" )
                log = true;
            else if( isLog.options == "off" )
                log = false;
        }
        //////// VOTE SETTING PARSE
        let isVote = settings.find(function(setting) {
            if( setting.name == Constants.Settings.VOTE && setting.server == msg.guild.id )
                return setting.options;
        });
        let vote = exports.isManagedServer( msg.guild );
        if( isVote ) {
            if( isVote.options == "on" )
                vote = true;
            else if( isLog.options == "off" )
                vote = false;
        }

        htSettings.put( "user " + Constants.Settings.PREFIX, prefix );
        htSettings.put( "server " + Constants.Settings.PREFIX, serverPrefix );
        htSettings.put( "server " + Constants.Settings.ISCHAIN, isChain );
        htSettings.put( "server command: ", disabledCommands );
        htSettings.put( "server " + Constants.Settings.ISLOG, log );
        htSettings.put( "server " + Constants.Settings.VOTE, vote );
        if( DEBUG )
            console.log( `Settings, message from user ${msg.author.tag}:
            prefix: ${prefix}
            serverPrefix: ${serverPrefix}
            chain: ${isChain}
            disabledCommands: ${disabledCommands.join(", ")}
            isLog: ${log}
            vote: ${vote}` );
        if( eventType == 'message' || eventType == 'messageDelete' )
            client.emit( eventType, msg, htSettings );
        else if( eventType == 'messageUpdate' )
            client.emit( eventType, msg, nm , htSettings );
        else if( eventType == 'messageReactionAdd' )
            client.emit( eventType, messageReaction, user, htSettings );
    });
}

exports.errHandler = function( err, msg ) {
    if( err ) {
        msg.channel.send( `Error encountered: \`\`\`\n${err.sqlMessage}\n\`\`\`` );
        return true;
    }
    return false;
}

function calcMilliseconds( weeks, days, hours, minutes, seconds ) {
    let milliseconds = weeks*604800000 + days*86400000 + hours*3600000 + minutes*60000 + seconds*1000;
    return milliseconds;
}

/**
 * Sends a welcome message to #general.
 * @param {@link GuildMember} member - The member to welcome.
 */
function sendWelcomeMessage( member ) {
    let welcomeChannel = exports.getChannelByNameGuild( member.guild, Constants.Strings.GENERAL );
    let botCommandsChannel = exports.getChannelByNameGuild( member.guild, Constants.Strings.BOTCOMMANDS );
    welcomeChannel.send( Constants.Strings.WELCOMEMESSAGE + member + Constants.Strings.WELCOMEMESSAGEEND + botCommandsChannel + Constants.Strings.WELCOMEMESSAGEEND2 );
}

/**
 * Checks if a member has the Rutgers Student, Alumni, or Guest roles but not the permissions role. This function is intended to be used to convert the legacy Rutgers Esports Discord to the "neo" Rutgers Esports Discord.
 * @param {@link GuildMember} member - The member to check.
 * @return {boolean} If the user has Rutgers Student, Alumni, or Guest roles but not the permissions role.
 */
function hasStudentAlumniGuest( member ) {
    let hasStudentAlumniGuest = false;
    let hasPrivRole = false;
    member.roles.forEach(( role ) => {
        if( role.name == Constants.Strings.SCHOOLROLE 
            || role.name == Constants.Strings.ALUMNIROLE 
            || role.name == Constants.Strings.GUESTROLE )
            hasStudentAlumniGuest = true;
        if( role.name == Constants.Strings.PRIVROLE )
            hasPrivRole = true;
    });
    return hasStudentAlumniGuest && !hasPrivRole;
}

function isStudent( role ) {
    return role.name.toLowerCase() == Constants.SpecialRoles[0].toLowerCase()
}

function isStudentAlumniGuest( role ) {
    let retBool = false;
    Constants.SpecialRoles.forEach(( specialRole ) => {
        if( specialRole.toLowerCase() == role.name.toLowerCase() )
            retBool = true;
    });
    return retBool;
}

/**
 * Checks if a role is a special role that is managed by the bot.
 * @param {@link Role} role - The role to check.
 * @returns {boolean} Whether or not the role is managed by the bot.
 */
function isPrivileged( role ) {
    let isPriv = false;
    for( let i = 0; i < Constants.PrivilegedRoles.length; i++ ) {
        if( role.name == Constants.PrivilegedRoles[i] || role.name == Constants.SpecialRoles[i] )
            isPriv = true;
    }
    return isPriv;
}

/**
 * Checks if a command is allowed to be run. Only checks if command is being run in #botcommands.
 * @param {@link Message} msg - The received message in a command to use to perform the check.
 * @returns {boolean} Whether or not the command can be run.
 */
exports.isRunnable = function( msg ) {
    if( msg.member.hasPermission( Constants.Permissions.KICKMEMBERS ) )
        return true;

    if( msg.channel.name == Constants.Strings.BOTCOMMANDS )
        return true;
    let botCommandsChannel = getChannelByName( msg, Constants.Strings.BOTCOMMANDS );
    msg.channel.send( Constants.Strings.BOTCOMMANDSWARNING + botCommandsChannel );
    return false;
}

/**
 * Sends an email using the mailgun service.
 * @param {Mailgun} mailgun - An instance of a mailgun.
 * @param {string} from - The sender of the email. Read mailgun docs for more info on properly formatting this field.
 * @param {string} to - The email address to send the email to.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The body of the email.
 */
function sendEmail( mailgun, from, to, subject, text ) {
    let data = {
        from: from,
        to: to,
        subject: subject,
        text: text
    };
    mailgun.messages().send( data, function( error, body ) {
        console.log( "Attempting to send email with following fields:\n" +
            "from: " + from + "\n" +
            "to: " + to + "\n" +
            "subject: " + subject + "\n" +
            "text: " + text + "\n" );
    });
}

/**
 * Generate a random number in a range.
 * @param {number} min - The minimum number that can be generated.
 * @param {number} max - The max number that can be generated.
 * @returns {number} The random number that has been generated.
 */
function generateRandom( min, max ) {
    let random = Math.floor(Math.random() * (max - min + 1)) + min;
    return random;
}

/**
 * Search for a server.
 * @param {@link Client} client - The Discord Client to search for servers in.
 * @param {string} name - The name of the server to search for.
 * @param {boolean} [contains] - Whether or not to do a "contains" search or an "exact match" search.
 * @returns {@link Guild} The guild that matches the search.
 */
function getServerByName( client, name, contains ) {
    if( contains === undefined )
        contains = false;

    let server;
    client.guilds.forEach(( guild ) => {
        if( !contains && guild.name == name )
            server = guild;
        if( contains && guild.name.includes( name ) )
            server = guild;
    });
    return server;
}

/**
 * Search a guild for a role by name using a {@link Message}.
 * @param {@link Message} msg - The message whose guild should be searched through.
 * @param {string} name - The name of the role to be searched for.
 * @return {@link Role} The role that matches the search.
 */
function getRoleByName( msg, name ) {
    let retRole;
    msg.guild.roles.forEach(( role ) => {
        // console.log( "comparing " + role.name + " and " + name );
        if( role.name == name )
            retRole = role;
    });
    return retRole;
}

/**
 * Search a guild for a channel by name using a {@link Message}.
 * @param {Message} msg - The message whose guild should be searched through.
 * @param {string} name - The name to search for.
 * @returns {TextChannel} A channel that matches the search.
 */
function getChannelByName( msg, name ) {
    let retChannel;

    msg.guild.channels.forEach(( channel ) => {
        if( channel.name == name && channel.type == 'text' )
            retChannel = channel;
    });

    return retChannel;
}

/**
 * Search a guild for a channel by name using a {@link Guild}.
 * @param {@link Guild} guild - The {@link Guild} to search through.
 * @param {string} name - The name of the channel to search.
 * @param {boolean} [contains] - Whether or not to do a "contains" search or an "exact match" search.
 * @returns {@link TextChannel} A channel that matches the search.
 */
exports.getChannelByNameGuild = function( guild, name, contains ) {
    if( contains === undefined )
        contains = false;
    let retChannel;

    guild.channels.forEach(( channel ) => {
        if( !contains && channel.name == name && channel.type == 'text' )
            retChannel = channel;
        if( contains && channel.name.includes( name ) && channel.type == 'text' )
            retChannel = channel;
    });

    return retChannel;
}

/**
 * Gets a role from a guild given its name and the {@link Guild}. Behavior not predicted for guilds with multiple roles of the same name.
 * @param {@link Guild} guild - The guild to check for a role.
 * @param {string} name - The name of the role to get.
 * @returns {@link Role} The {@link Role} found through the search.
 */
exports.getRoleByNameGuild = function( guild, name ) {
    let retRole;
    guild.roles.forEach(( role ) => {
        if( role.name == name )
            retRole = role;
    });
    return retRole;
}

/**
 * Return an array of roles that exclude a certain permission given a {@link Collection} of roles provided by {@link GuildMember}.roles.
 * @param {Collection<{@link Snowflake}, {@link Role}>} roles - A collection of roles to iterate through
 * @param {string} permission - A permission flag defined in the discord.js documentation.
 * @returns {{@link Role}[]} An array of roles excluding the permission.
 */
function roleExclude( roles, permission ) {
    let perms = true;
    if( permission === undefined )
        perms = false;

    let retArr = [];
    let breakVar = false;

    roles.forEach(( role ) => {
        if( !perms )
            retArr.push( role );
        else if( !role.hasPermission( permission, false, true ) )
            retArr.push( role );
    })
    return retArr;
}

/**
 * Takes a Collection of roles and formats an embedded message with a list of them. Extra parameters can be passed to filter roles.
 *
 * @param {Collection} roles - A collection of {@link Role}s from the guild.
 * @param {boolean} [excludeEveryone=false] - Whether or not to exclude @everyone from the list
 * @param {string} [permission=false] - A discord.js permission flag that will be excluded from the list of roles
 *
 * @returns {RichEmbed} An embedded message with a custom-filtered list of roles.
 */
 function collToEmbedRoles( roles, excludeEveryone, permission ) {
    if( permission === undefined )
        permission = false;
    if( excludeEveryone === undefined )
        excludeEveryone = false;
    let retString = "";

    roles.forEach(( role ) => {
        if( excludeEveryone )
            if( role.name == "@everyone" )
                return;
        if( isPrivileged( role ) )
            return;
        if( !permission )
            retString += role.name + "\n";
        else if( !role.hasPermission( permission, false, true ) )
            retString += role.name + "\n";
    })

    let embed = new RichEmbed()
        .setTitle(Constants.Strings.EMROLES)
        .setColor(0xFF0000)
        .setDescription( retString );

    return embed;
}

/**
 * Cleans and standardizes arguments for a command. It trims and lowercases all arguments.
 * @param {string[]} arr - An array of arguments to be cleaned.
 * @returns {string[]} A clean array of arguments.
 */
exports.clean = function( arr ) {
    let retCleanArr = [];
    arr.forEach(( arg ) => {
        arg = arg.trim();
        arg = arg.toLowerCase();
        retCleanArr.push( arg )
    })
    return retCleanArr;
}
