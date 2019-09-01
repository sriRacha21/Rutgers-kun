const Constants = require( './Constants.js' )
const Commands = require('./Commands.js');
const { Client, RichEmbed } = require('discord.js')
// read sound files
const fs = require('fs');
// woof stuff
const https = require('https');
var breeds;
https.get( "https://api.woofbot.io/v1/breeds", function(res) {
	res.on('data', function(data) {
		let woofData = JSON.parse( data );
		if( woofData.status = "success" )
            breeds = woofData.response.breeds;
        let moddedBreeds = [];
        breeds.forEach(( breed ) => {
            moddedBreeds.push( breed.replace(" ","") );
        });
        Instructions.WOOFINSTRUCTION.push( moddedBreeds );
    });
})

// instruction, format, restriction, aliases, extra, subcommands
Instructions = {
    // HELP COMMAND MESSAGES
    NOINSTRUCTIONS: "There are no instructions on how to use this command.",
    ROLEINSTRUCTION: ["Use `[prefix]role add role name` or `[prefix]role remove role name` to add or remove roles. You can list as many roles as you want to add or remove multiple roles at once. Make sure you separate the roles with commas if you want to add or remove multiple. See the list of roles you can add with `[prefix]roles`.",
        "role <add/remove/list> <role-name>"],
    FALLBACKINSTRUCTION: "That's not a command. You can use `[prefix]help` to see the list of commands.",
    MUTEINSTRUCTION: ["Use this command to stop people from talking in channels for a designated amount of time. Add arguments to mute them for anywhere between a few seconds to multiple days. You cannot use this command without specifying how long someone will be muted.",
        "mute @member <number><w/d/h/m/s>",
        "Moderator"],
    UNMUTEINSTRUCTION: ["Use this command to unmute people before the timer ends.",
        "unmute @member",
        "Moderator"],
    IGNOREINSTRUCTION: ["Make the bot ignore users.",
        "ignore <add/remove/list> @member ?<number><w/d/h/m/s>",
        "Moderator"],
    EIGHTBALLINSTRUCTION: ["Ask a yes or no question to this command. Make sure your question ends with a question mark.",
        "8ball is this an example question?"],
    LOVEINSTRUCTION: ["Supply two arguments to calculate how much one person loves another[prefix] :heart:",
        "love <string1>, <string2>"],
    ROLLINSTRUCTION: ["Roll x y-sided dice with or without details.",
        "roll <x> <y> <z>",
        null,
        null,
        "Default values are `x = 1`, `y = 6` and `z=false`. Pass `true` or `yes` to `z` argument to get details about the bulk roll."],
    WOOFINSTRUCTION: ["Cute dog.",
        "woof <?breed>",
        null,
        null,
        "API for this command by " + Constants.Strings.JOEYTAG + ":\nGithub: https://github.com/joey-colon \n Woof: https://woofbot.io/ "],
    MEOWINSTRUCTION: ["Cute cat.",
        "meow"],
    EXECUTEINSTRUCTION: ["Run Java or Python code snippets.\nFormat: `[prefix]execute java/py code`",
        `execute <${Constants.SupportedLanguagesArr.join("/")}> <code>`,
        null,
        ["exec"]],
    ADDCOMMANDINSTRUCTION: ["Add a custom command.",
        "addcommand <name> <contents>"],
    COMMANDINSTRUCTION: ["Work with custom commands.",
        "command <add/delete/edit/list/detail> <name> ?<message>",
        null,
        ["addcommand","deletecommand","listcustomcommands","lcc"],
        "Each alias is a shortcut for a different part of this command.",
        ["add","delete","edit","list","detail"]],
    GIVEPERMSALLINSTRUCTION: ["This command is meant to be used to give all users with a Rutgers Student, Alumni, or Guest role a special permissions role. This is meant to be used one time to convert legacy Rutgers Esports Discord to work properly with the bot.",
        "givepermsall",
        "Admin",
        null,
        "This command has been deprecated since version 1. Do not use it."],
    QUOTEINSTRUCTION: ["Ping another user in the server with this command to save their last message. See all their saved messages with `[prefix]quotes @member`. You cannot quote yourself.",
        "quote @member",],
    QUOTESINSTRUCTION: ["Ping another user in the server with this command to see their messages saved with `[prefix]quote`. You can see your own quotes by not passing any arguments.",
        "quotes ?@member"],
    QUERYINSTRUCTION: ["Use this command to send an SQL query to the database. There is very little input sanitization or table protection so be careful.",
        "query <sql-query>",
        "Admin"],
    FILTERINSTRUCTION: ["Filter a certain word for a certain amount of time.",
        "filter <add/remove/list> word <number><w/d/h/m/s>",
        "Moderator",
        ["unfilter","filters"],
        null,
        ["add","remove","list"]],
    WARNINSTRUCTION: ["Warn members with this command. The bot will send them a message containing the offending message, the rule they broke, and notes if there are any attached with the command.",
        "warn message-id ; rule-number rule-number-2 ... ; ?notes",
        "Moderator",],
    WARNSINSTRUCTION: ["View a list of warned messages by a user.",
        "warns @member",
        "Moderator"],
    ECHOINSTRUCTION: ["Echo a message to another channel",
        "echo <channel> <message>",
	    "Moderator"],
    PLAYINSTRUCTION: ["Play a sound file from the bot's soundboard.",
        "play <sound name>",
        null,
        null,
        `Sounds: ${soundsStr(getVoiceFiles())}`],
    ADDSOUNDINSTRUCTION: ["Add sounds to the bot's soundboard with this command. Only supports MP3 right now.",
        "addsound <attach .mp3 file>"],
    LEAVEINSTRUCTION: ["Use this command to make the bot leave the voice channel it is currently in.",
        "leave"],
    ADDEMOTEINSTRUCTION: ["Add emotes to the server with this command. The filename will be used as the emote name.",
        "addemote ?emotename <attach image file>"],
    SCHEDULEINSTRUCTION: ["Schedule messages to send in channel(s). You can pass `none` to `role-to-ping` to not ping any roles.",
        "schedule <message-to-send> ; <channel-name-1> <channel-name-2> ... ; <role-to-ping-1> <role-to-ping-2> ... ; <number><w/d/h/m/s>",
        "Mention Everyone"],
    UPDATERULESINSTRUCTION: ["Update the rules through the database.",
        "updaterules <rule-number> <rule-text>",
        "Admin"],
    FILTERFROMLIVEINSTRUCTION: ["Filter a user from getting the live role.",
        "filterfromlive @member",
        "Admin"],
    DMINSTRUCTION: ["DM a user.",
        "dm @member <message>",
        "Admin"],
    SETWORDINSTRUCTION: ["Add a word to be tracked for a certain user.",
        "setword ?@member <word>",
        null,
        null,
        null,
        ["delete"]],
    SETROLERESPONSEINSTRUCTION: ["Set a custom response for the bot to DM a user when they add a certain role.",
        "setroleresponse <role-name>, <message>",
        "Manage Channels"],
    SETPINGEXCEPTIONINSTRUCTION: ["Set a role to be allowed to be pinged by anyone without muting them.",
        "setpingexception <role-name>",
        "Admin"],
    SETAUTOVERIFYINSTRUCTION: ["Set a message that can be sent to #agreement to auto-verify the user to enter the server. For use at events.",
        "setautoverify <word>",
        "Admin"],
    DJSINSTRUCTION: ["Dump API Information.",
        "djs msg.?<api-access>.?<api-access>. ...",
        "Admin"],
    SETTINGSINSTRUCTION: ["Change user settings for the bot or server settings if you have the right permissions. See personal and server settings.",
        "settings <name> <options>",
        null,
        null,
        "See adjustable settings with [prefix]settings.",
        ["user","server","prefix <prefix>"]],
}

exports.helpCommand = function( arguments, msg, admin, client, prefix ) {
    if ( arguments.length == 1 ) {
        let command = arguments[0];
        let embed = new RichEmbed()
            .setAuthor(`Command instructions:`, client.user.displayAvatarURL )
            .setTitle(prefix + command)
            .setColor(0xFF0000)
            .setThumbnail( client.user.displayAvatarURL )
            .setFooter( client.user.tag, client.user.displayAvatarURL );
        switch( command ) {
            case Constants.Commands.ROLE:
                generateCommandField( embed, Instructions.ROLEINSTRUCTION, prefix );
                break;
            case Constants.Commands.MUTE:
                generateCommandField( embed, Instructions.MUTEINSTRUCTION, prefix );
                break;
            case Constants.Commands.UNMUTE:
                generateCommandField( embed, Instructions.UNMUTEINSTRUCTION, Formats.UNMUTEFORMAT, Restrictions.UNMUTERESTRICTION, prefix );
                break;
            case Constants.Commands.IGNORE:
                generateCommandField( embed, Instructions.IGNOREINSTRUCTION, Formats.IGNOREFORMAT, Restriction.IGNORERESTRICTION, prefix );
                break;
            case Constants.Commands.EIGHTBALL:
                generateCommandField( embed, Instructions.EIGHTBALLINSTRUCTION, prefix );
                break;
            case Constants.Commands.LOVE:
                generateCommandField( embed, Instructions.LOVEINSTRUCTION, prefix );
                break;
            case Constants.Commands.ROLL:
                generateCommandField( embed, Instructions.ROLLINSTRUCTION, prefix );
                break;
            case Constants.Commands.WOOF:
                generateCommandField( embed, Instructions.WOOFINSTRUCTION, prefix );
                break;
            case Constants.Commands.MEOW:
                generateCommandField( embed, Instructions.MEOWINSTRUCTION, prefix );
                break;
            case Constants.CommandSynonyms.EXEC:
            case Constants.Commands.EXECUTE:
                generateCommandField( embed, Instructions.EXECUTEINSTRUCTION, prefix );
                break;
            case Constants.Commands.PLAY:
                generateCommandField( embed, Instructions.PLAYINSTRUCTION, prefix );
                break;
            case Constants.Commands.ADDSOUND:
                generateCommandField( embed ,Instructions.ADDSOUNDINSTRUCTION, prefix );
                break;
            case Constants.Commands.LEAVE:
                generateCommandField( embed, Instructions.LEAVEINSTRUCTION, prefix );
                break;
            case Constants.Commands.ADDEMOTE:
                generateCommandField( embed, Instructions.ADDEMOTEINSTRUCTION, prefix );
                break;
            case Constants.CommandSynonyms.ADDCOMMAND:
                generateCommandField( embed, Instructions.ADDCOMMANDINSTRUCTION, prefix );
                break;
            case Constants.Commands.COMMAND:
                generateCommandField( embed, Instructions.COMMANDINSTRUCTION, prefix );
                break;
            case Constants.Commands.GIVEPERMSALL:
                generateCommandField( embed, Instructions.GIVEPERMSALLINSTRUCTION, prefix );
                break;
            case Constants.Commands.QUOTE:
                generateCommandField( embed, Instructions.QUOTEINSTRUCTION, prefix );
                break;
            case Constants.Commands.QUOTES:
                generateCommandField( embed, Instructions.QUOTESINSTRUCTION, prefix );
                break;
            case Constants.Commands.QUERY:
                generateCommandField( embed, Instructions.QUERYINSTRUCTION, prefix );
                break;
            case Constants.Commands.FILTER:
                generateCommandField( embed, Instructions.FILTERINSTRUCTION, prefix );
                break;
            case Constants.Commands.WARN:
                generateCommandField( embed, Instructions.WARNINSTRUCTION, prefix );
                break;
            case Constants.Commands.WARNS:
                generateCommandField( embed, Instructions.WARNSINSTRUCTION, prefix );
                break;
            case Constants.Commands.ECHO:
                generateCommandField( embed, Instructions.ECHOINSTRUCTION, prefix );
                break;
            case Constants.Commands.SCHEDULE:
                generateCommandField( embed, Instructions.SCHEDULEINSTRUCTION, prefix );
                break;
            case Constants.Commands.UPDATERULES:
                generateCommandField( embed, Instructions.UPDATERULESINSTRUCTION, prefix );
                break;
            case Constants.Commands.FILTERFROMLIVE:
                generateCommandField( embed, Instructions.FILTERFROMLIVEINSTRUCTION, prefix );
                break;
            case Constants.Commands.DM:
                generateCommandField( embed, Instructions.DMINSTRUCTION, prefix );
                break;
            case Constants.Commands.SETWORD:
                generateCommandField( embed, Instructions.SETWORDINSTRUCTION, prefix );
                break;
            case Constants.Commands.SETROLERESPONSE:
                generateCommandField( embed, Instructions.SETROLERESPONSEINSTRUCTION, prefix );
                break;
            case Constants.Commands.SETPINGEXCEPTION:
                generateCommandField( embed, Instructions.SETPINGEXCEPTIONINSTRUCTION, prefix );
                break;
            case Constants.Commands.SETAUTOVERIFY:
                generateCommandField( embed, Instructions.SETAUTOVERIFYINSTRUCTION, prefix );
                break;
            case Constants.Commands.DJS:
                generateCommandField( embed, Instructions.DJSINSTRUCTION, prefix );
                break;
            case Constants.Commands.SETTINGS:
                generateCommandField( embed, Instructions.SETTINGSINSTRUCTION, prefix );
                break;
            default:
                if( Constants.CommandsArray.includes(command) ) {
                    msg.channel.send( Instructions.NOINSTRUCTIONS );
                    return;
                }
                else {
                    msg.channel.send( Instructions.FALLBACKINSTRUCTION.replace("[prefix]",prefix) );
                    return;
                }
        }
        msg.channel.send( embed );
    } else {
        if( Commands.isManagedServer( msg.guild ) ) {
            if( !admin )
                msg.channel.send( exports.arrToEmbedHelp( Constants.CommandsArray, Constants.HiddenCommands, prefix ) );
            else if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS, false, true ) )
                msg.react( Instructions.EYEROLL );
            else
                msg.channel.send( exports.arrToEmbedHelp( Constants.HiddenCommands, null, prefix ) );
        } else {
            if( !admin )
                msg.channel.send( exports.arrToEmbedHelp( Constants.CommandsArray, Constants.ManagedCommands, prefix ) );
            else if( !msg.member.hasPermission( Constants.Permissions.KICKMEMBERS, false, true ) )
                msg.react( Instructions.EYEROLL );
            else
                msg.channel.send( exports.arrToEmbedHelp( Constants.HiddenCommands, null, prefix ) );
        }
    }
}

function generateCommandField( embed, instructionArr, prefix ) {
    let regex = /\[prefix\]/g;
    let instruction = instructionArr[0];
    let format = instructionArr[1];
    let commandName = format.split(" ")[0];
    let restriction = instructionArr[2] ? instructionArr[2] : "none";
    embed.setDescription( instruction.replace(regex,prefix) )
        .addField( "Format:", "`" + prefix + format + "`" )
    if( instructionArr[3] ) {
        restrictions = [];
        instructionArr[3].forEach(( restriction ) => restrictions.push( "`" + prefix + restriction + "`" ) );
        let aliasString = restrictions.join(", ");
        embed.addField( "Aliases:", aliasString );
    }
    if( instructionArr[5] ) {
        subcommands = [];
        instructionArr[5].forEach(( subcommand ) => subcommands.push( "`" + prefix + commandName + " " + subcommand + "`" ));
        let subcommandString = subcommands.join("\n");
        embed.addField( "Subcommands:", subcommandString );
    }

    embed.addField( "Restriction:", `\`${restriction}\``);
    if( instructionArr[4] )
        embed.addField( "Extra:", instructionArr[4].replace(regex,prefix) );
}

function soundsStr( sounds ) {
    let returnStr = "";
    sounds.forEach(( sound ) => {
        returnStr += "\n`" + sound + "`";
    });
    return returnStr;
}

exports.getVoiceFiles = function() {
    let voiceFiles = [];
    fs.readdirSync( Constants.Strings.ABSOLUTEPATH ).forEach( file => {
        let dotIndex = file.search( /\./g );
        file = file.slice( 0, dotIndex );
        voiceFiles.push( file );
    })
    return voiceFiles;
}

function getVoiceFiles() {
    let voiceFiles = [];
    fs.readdirSync( Constants.Strings.ABSOLUTEPATH ).forEach( file => {
        let dotIndex = file.search( /\./g );
        file = file.slice( 0, dotIndex );
        voiceFiles.push( file );
    })
    return voiceFiles;
}

exports.arrToEmbedHelp = function( commandsArr, hidden, prefix ) {
    if( hidden === undefined || hidden == null )
        hidden = [];

    let retString = "";
    for( let i = 0; i < commandsArr.length; i++ ) {
        let isAdd = true;
        for( let j = 0; j < hidden.length; j++ ) {
            if( commandsArr[i] == hidden[j] )
                isAdd = false;
        }
        if( isAdd ) {
            if( commandsArr[i] != "" ) 
                retString += prefix + commandsArr[i] + "\n";
        }
    }

    let embed = new RichEmbed()
        .setTitle(Constants.Strings.EMCOMMANDS)
        .setColor(0xFF0000)
        .setDescription( retString );

    return embed;
}
