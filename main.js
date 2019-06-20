/**
 * @fileOverview This is the main.js file for the Rutgers Esports Discord Bot. This file processes commands and contains "Command" functions which reply to messages that start with a previously designated prefix. It also contains helper methods for said functions.
 *
 * @author Arjun Srivastav
 *
 * @requires NPM:discord.js
 * @requires custom_modules/constants.js:Constants
 */

// EXPERIMENTAL BRANCH?
const EXPERIMENTAL = true;

// imports
const Discord = require('discord.js')
const client = new Discord.Client()
const { Client, RichEmbed } = require('discord.js')
const Constants = require( './custom_modules/Constants.js' )

// DEBUG
const DEBUG = Constants.DEBUG;
////////

const Commands = require( './custom_modules/Commands.js' )
var API_Keys = EXPERIMENTAL ? require( './custom_modules/API_keys_experimental.js') : require('./custom_modules/API_keys.js');
const Help = require('./custom_modules/Help.js');
const mg = require('mailgun-js');
const Mailgun = require('mailgun-js')({
	apiKey: API_Keys.mailgun_api_key,
	domain: API_Keys.mailgun_domain
});
const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
const HashTable = require('hashtable');
const mysql = require('mysql');
const database = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : API_Keys.database_password,
    database : 'redb'
});
// file system
const fs = require('fs');
// utils
const util = require('util');
// hashtables
const htNewMembers = new HashTable();
const htAccept = new HashTable();
const htSecondToLastMessages = new HashTable();
const htChainCounter = new HashTable();
const htChainMessages = new HashTable();
const htIgnoredUsers = new HashTable();
const htVotes = new HashTable();
// word filtering
var filterWords = [];
// count lines
const execSync = require('child_process').execSync;
// emoji stuff
const EmojiFile = require('./node_modules/emoji-js/lib/emoji.js');
const EmojiConvertor = new EmojiFile.EmojiConvertor();
EmojiConvertor.colons_mode = true;
EmojiConvertor.text_mode = true;
// woof stuff
const https = require('https');
var breeds;
https.get( "https://api.woofbot.io/v1/breeds", function(res) {
	res.on('data', function(data) {
		let woofData = JSON.parse( data );
		if( woofData.status = "success" )
			breeds = woofData.response.breeds;
	});
})
// twitch stuff
const request = require("request");
const TwitchClient = require('twitch').default;
var twitchClient;
// tiffany typing message
var isTiffanyTimerSet = false;

client.on('ready', async () => {
	console.log( "Connected as " + client.user.tag );
	generatePresence(0);
	if( database ) console.log( `Database connection established` );
	let access_token;
	let uriToPost = `https://id.twitch.tv/oauth2/token?client_id=${API_Keys.twitch_client_id}&client_secret=${API_Keys.twitch_client_secret}&grant_type=client_credentials&scope=user_read+channel_read`;
	// console.log( "POST: " + uriToPost );
	request({
		uri: uriToPost,
		method: "POST",
	}, async function(err,res,body) {
		access_token = JSON.parse( body ).access_token;
		if( access_token ) {
			twitchClient = await TwitchClient.withCredentials( API_Keys.twitch_client_id, access_token );
			console.log( "Got access token from Twitch." );
		}
	});
})

//EVENTS
client.on( 'message', (receivedMessage, settings) => {
    // This stops the bot from replying to itself or other bots
    if( receivedMessage.author == client.user || receivedMessage.author.bot )
		return;
	
	// settings that update per message
	if( !settings ) {
		Commands.getSettings( receivedMessage, null, null, null, "message", database, client );
		return;
	}
	let prefix = settings.get( "user " + Constants.Settings.PREFIX );
	let isChain = settings.get( "server " + Constants.Settings.ISCHAIN );
	let disabledCommands = settings.get( "command: " );

	// Check if user is in #agreement channel first
	// this happens before processCommand because we only want the user to be able to use !agree
	// if they are in the agreement channel
	if( receivedMessage.channel.name == Constants.Strings.AGREEMENT )
		receivedMessage.delete();

	// this block is for the email verification stuff.
	if( receivedMessage.channel.type == 'dm' ) {
		if( receivedMessage.content.endsWith( Constants.Strings.SCHOOL.toLowerCase() + ".edu" )  )
			Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, [], receivedMessage, htNewMembers, 2 );
		else if( receivedMessage.content.endsWith( ".com" ) )
			receivedMessage.channel.send( Constants.Strings.RUTGERSEMAILPLS );
		else
			Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, [], receivedMessage, htNewMembers, 3 );
		return;
	}

	// auto add reactions to messages in votes channel
	if( receivedMessage.channel.name == Constants.Strings.VOTES ) {
		if( htVotes.get( receivedMessage.channel.id ) ) {
			receivedMessage.author.send( Constants.Strings.VOTERUNNING );
			receivedMessage.delete();
		} else {
			receivedMessage.react( Constants.Strings.THUMBSUP );
			receivedMessage.react( Constants.Strings.THUMBSDOWN );

			let hours = 72;
			let minutes = 0;
			let seconds = 0;
			let milliseconds = hours*3600000 + minutes*60000 + seconds*1000;
			let timer = setTimeout( function() {
				receivedMessage.channel.send( Constants.Strings.VOTETIMEOUT );
			}, milliseconds );
			htVotes.put( receivedMessage.id, timer );
			htVotes.put( receivedMessage.channel.id, timer );
		}
	}

	// kick users if they mention any role and they have no perms.
	if( receivedMessage.member === undefined || receivedMessage.member == null )
		return;
	if( !receivedMessage.member.hasPermission( Constants.Permissions.MENTIONEVERYONE ) ) {
		let atLeastOneRoleMentioned = false;
		let roleMentioned = "undefined";
		receivedMessage.mentions.roles.forEach(( role ) => {
			if( !role.hasPermission( Constants.Permissions.KICKMEMBERS, false, true ) ) {
				roleMentioned = role.name;
				atLeastOneRoleMentioned = true;
			}
		});
		let attemptToPingEveryone = receivedMessage.content.includes( "@everyone" ) || receivedMessage.content.includes( "@here" );
		if( atLeastOneRoleMentioned || attemptToPingEveryone ) {
			if( !Commands.isManagedServer( receivedMessage.guild ) )
				return;
			receivedMessage.delete();
			let auditChannel = getChannelByName( receivedMessage, Constants.Strings.AUDIT );
			auditChannel.send( Constants.Strings.PINGATTEMPTCAUGHT );
			if( roleMentioned == "undefined" )
				roleMentioned = "@everyone";
			receivedMessage.channel.send( Constants.Strings.GHOSTPING + roleMentioned + Constants.Strings.GHOSTPING2, {disableEveryone: true} );
			
			Commands.mute( receivedMessage.member, Constants.Strings.DEFAULTMUTETIME );
			receivedMessage.author.send( Constants.Strings.MENTIONMUTE + Constants.Strings.DEFAULTMUTETIME + Constants.Strings.MENTIONMUTE2 );
		}
	}

	// word filtering
	if( Commands.isManagedServer( receivedMessage.guild ) && !receivedMessage.member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
		for( let i = 0; i < filterWords.length; i++ ) {
			filterWord = filterWords[i];
			if( receivedMessage.content.toLowerCase().search( filterWord ) != -1 ) {
				receivedMessage.delete();
				let auditChannel = getChannelByName( receivedMessage, Constants.Strings.AUDIT );
				auditChannel.send( Constants.Strings.FILTEREDWORDCAUGHT );
				receivedMessage.author.send( Constants.Strings.FILTEREDWORDWARN );
				return;
			}
		}
	}

	// user ignoring
	if( !receivedMessage.member.hasPermission( Constants.Permissions.ADMIN ) && htIgnoredUsers.get( receivedMessage.member.id ) )
		return;

	// if rutgers-kun sees his love, heart emote react
	rutgersChan( receivedMessage );

	// Command will be processed if it starts with the designated prefix
    if( receivedMessage.content.startsWith( prefix ) || receivedMessage.content.startsWith( `<@${client.user.id}>` ) )
		processCommand( receivedMessage, settings );
	
	if( isChain ) {
		///////////////// CHAIN COUNTING LOGIC /////////////////////////
		let secondToLastMessage = htSecondToLastMessages.get( receivedMessage.channel.id );
		let samePersonTwice = false;
		let chainMessages = htChainMessages.get( receivedMessage.channel.id );
		if( chainMessages ) {
			chainMessages.forEach(( message ) => {
				if( message.author.id == receivedMessage.author.id )
					samePersonTwice = true;
			})
		}
		// check if second to last message is same as last message
		if( secondToLastMessage
			&& !samePersonTwice
			&& secondToLastMessage.author.id != receivedMessage.author.id
			&& secondToLastMessage.content == receivedMessage.content
			&& receivedMessage.content != "") {
			////////// CHAIN HIT //////////
			// add to record of messages in chain
			if( !htChainMessages.get( receivedMessage.channel.id ) )
				htChainMessages.put( receivedMessage.channel.id, [] );
			let chainMessagesArr = htChainMessages.get( receivedMessage.channel.id );
			chainMessagesArr.push( receivedMessage );
			if( !htChainCounter.get( receivedMessage.channel.id ) )
				chainMessagesArr.push( secondToLastMessage );
			htChainMessages.put( receivedMessage.channel.id, chainMessagesArr );

			// incremement chain counter
			if( !htChainCounter.get( receivedMessage.channel.id ) )
				htChainCounter.put( receivedMessage.channel.id, 2 ); 
			else {
				let temp = htChainCounter.get( receivedMessage.channel.id )
				htChainCounter.remove( receivedMessage.channel.id );
				htChainCounter.put( receivedMessage.channel.id, temp+1 );
			}

			// react appropriately
			if( htChainCounter.get( receivedMessage.channel.id ) == 2 ) {
				let reactionArr = numToEmoteArray( htChainCounter.get( receivedMessage.channel.id ) );
				let reactionArrFirstMsg = numToEmoteArray( htChainCounter.get( receivedMessage.channel.id ) - 1 );
				reactionArr.forEach(( reaction ) => {
					receivedMessage.react( reaction );
				});
				reactionArrFirstMsg.forEach(( reaction ) => {
					secondToLastMessage.react( reaction );
				});
			} else if( htChainCounter.get( receivedMessage.channel.id ) > 2 ) {
				let reactionArr = numToEmoteArray( htChainCounter.get( receivedMessage.channel.id ) );
				let reactionPromise;
				reactionArr.forEach(( reaction ) => {
					if( reactionPromise )
						reactionPromise = reactionPromise.then( receivedMessage.react( reaction ) );
					else
						reactionPromise = receivedMessage.react( reaction );
				});
			}
		} else {
			///////// CHAIN MISS ////////
			if( htChainCounter.get( receivedMessage.channel.id ) > 2 )
				receivedMessage.react( Constants.Strings.ANGRY );
			htChainMessages.remove( receivedMessage.channel.id );
			htChainCounter.remove( receivedMessage.channel.id );
		}
		// clean up hash table entry if there's a new message in a channel
		if( secondToLastMessage )
			htSecondToLastMessages.remove( receivedMessage.channel.id );
		// remember second to last message per-channel
		htSecondToLastMessages.put( receivedMessage.channel.id, receivedMessage );
	}
});

client.on( "messageDelete", (deletedMessage, settings) => {
	// ignore messages by the bot that were deleted
    if( deletedMessage.author == client.user )
		return;

	if( deletedMessage.member === undefined || deletedMessage.member == null )
		return;
	// ignore messages by members with admin/mod permission (bots)
	if( deletedMessage.member.user.bot )
		return;

	// ignore messages in #agreement or #voice that were deleted
	if( deletedMessage.channel.name == Constants.Strings.AGREEMENT
		|| deletedMessage.channel.name == "voice" )
		return;

	if( !settings ) {
		Commands.getSettings( deletedMessage, null, null, null, "messageDelete", database, client );
		return;
	}

	let isLog = settings.get( "server " + Constants.Settings.ISLOG );
	if( DEBUG )
		console.log( `Settings, deleted message from user ${deletedMessage.author.tag}:
			log: ${isLog}`);

	if( isLog )
		Commands.deletedCommand( deletedMessage, client );
});

client.on( "messageUpdate", (oldMessage, newMessage, settings) => {
	// ignore empty edits and self edits
	if( oldMessage.content == newMessage.content || client.user == oldMessage.author )
		return;

	// error catching
	if( oldMessage.member === undefined || oldMessage.member == null )
		return;

	// ignore messages by members with admin permission (bots)
	if( oldMessage.member.user.bot )
		return;

	// dont kill messages edited in votes
	if( newMessage.channel.name == Constants.Strings.VOTES )
		return;

	if( !settings ) {
		Commands.getSettings( oldMessage, newMessage, null, null, "messageUpdate", database, client );
		return;
	}

	// process commands that were edited in
	client.emit('message', newMessage);

	let isLog = settings.get( "server " + Constants.Settings.ISLOG );
	if( DEBUG )
		console.log( `Settings, updated message from user ${newMessage.author.tag}:
			log: ${isLog}`);

	if( isLog )
		Commands.editedCommand( oldMessage, newMessage, client );
});

client.on( "guildMemberAdd", (guildMember) => {
	if( !Commands.isManagedServer( guildMember.guild ) )
		return;

	// log member join
	let auditChannel = Commands.getChannelByNameGuild( guildMember.guild, Constants.Strings.AUDIT );
	let embed = new RichEmbed()
        .setAuthor( Constants.Strings.MEMBERJOINED, Constants.Strings.ICONLINK )
		.setTitle( guildMember.user.tag )
        .setColor( 0xFF0000 )
		.setThumbnail( guildMember.user.displayAvatarURL )
	auditChannel.send( embed );
	// start a timer that will kick the member after an hour.
	// this is a safety function that is intended to stop spammers and keep the hashTable clean.
	let hours = 24;
	let minutes = 0;
	let seconds = 0;
	let milliseconds = hours*3600000 + minutes*60000 + seconds*1000;
	let time = setTimeout( Commands.kickCommand, milliseconds, guildMember );
	// put it in the hashtable so we can cancel the timer when they !agree
	htNewMembers.put( guildMember.id, time );
});

client.on( "guildMemberRemove", (guildMember) => {
	if( !Commands.isManagedServer( guildMember.guild ) )
		return;

	// log member leave
	let auditChannel = Commands.getChannelByNameGuild( guildMember.guild, Constants.Strings.AUDIT );
	let embed = new RichEmbed()
        .setAuthor( Constants.Strings.MEMBERLEFT, Constants.Strings.ICONLINK )
		.setTitle( guildMember.user.tag )
        .setColor( 0xFF0000 )
		.setThumbnail( guildMember.user.displayAvatarURL )
	auditChannel.send( embed );
});

client.on( "presenceUpdate", (oldGuildMember, newGuildMember) => {
	if( !Commands.isManagedServer( oldGuildMember.guild ) )
		return;

	if( newGuildMember.user.bot )
		return;

	let oldIsStreaming = false;
	let newIsStreaming = false;

	if( !( oldGuildMember.presence.game === undefined || oldGuildMember.presence.game === null ) ) 
		oldIsStreaming = oldGuildMember.presence.game.streaming;
	if( !( newGuildMember.presence.game === undefined || newGuildMember.presence.game === null ) )
		newIsStreaming = newGuildMember.presence.game.streaming;

	if( !oldIsStreaming && newIsStreaming )
		newGuildMember.addRole( Commands.getRoleByNameGuild( newGuildMember.guild, Constants.Strings.LIVEROLE ) );
	if( oldIsStreaming && !newIsStreaming )
		newGuildMember.removeRole( Commands.getRoleByNameGuild( newGuildMember.guild, Constants.Strings.LIVEROLE ) );
});

client.on( "typingStart", (channel, user) => {
	if( channel.name == "shitposting" && user.id == "144264540484403200" && !isTiffanyTimerSet ) {
		channel.send( "`( ´･ω･)っ✂╰⋃╯`" );
		isTiffanyTimerSet = true;
		let hours = 0;
		let minutes = 20;
		let seconds = 0;
		let milliseconds = hours*3600000 + minutes*60000 + seconds*1000;
		setTimeout( function() {isTiffanyTimerSet=false}, milliseconds );
	}
});

client.on( "messageReactionAdd", (messageReaction, user, settings) => {
	if( user.bot )
		return;
	
	// delete bot messages with a reaction
	if( messageReaction.message.author.bot
		&& messageReaction.emoji == Constants.Strings.NOENTRY
		&& !messageReaction.message.mentions.everyone
		&& messageReaction.message.mentions.members.array().length == 0
		&& messageReaction.message.mentions.roles.array().length == 0 ) {
		let msg = messageReaction.message;
		let auditChannel = getChannelByName( msg, Constants.Strings.AUDIT );
		let embeds;
		let embed = new RichEmbed()
			.setAuthor( `Bot message deleted:`, client.user.displayAvatarURL )
			.setTitle( `by ${user.tag}` )
			.setColor(0xFF0000)
			.addField( `in channel:`, msg.channel )
			.setThumbnail( user.displayAvatarURL )
			.setFooter( Constants.Strings.TIMESTAMP + msg.createdAt );
		if( msg.content && msg.content.length < 1024 )
			embed.addField( `Message contents:`, msg.content );
		auditChannel.send( embed );
		messageReaction.message.delete();
		return;
	}
		
	if( !settings ) {
		Commands.getSettings( messageReaction.message, null, messageReaction, user, "messageReactionAdd", database, client );
		return;
	}

	let prefix = settings.get( "user " + Constants.Settings.PREFIX );
	// approve
	if( messageReaction.message.channel.name == Constants.Strings.APPROVAL
		&& messageReaction.emoji == Constants.Strings.THUMBSUP 
		&& messageReaction.message.embeds.length > 0
		&& messageReaction.message.embeds[0].author.name.toLowerCase().includes("command") ) {
		let query = `SELECT * FROM commands WHERE request_id='${messageReaction.message.id}' AND server_id=${messageReaction.message.guild.id}`;
		if( DEBUG )
			console.log( "built query: " + query );
		database.query( query, function( err, results ) {
			if( err ) {
				messageReaction.message.channel.send( `Error encountered: \`\`\`\n${err.sqlMessage}\n\`\`\`` );
				return;
			}
			if( results.length > 0 ) {
				if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
					if( messageReaction.count > 2 ) {
						messageReaction.remove( user );
						user.send( Constants.Strings.ALREADYAPPROVED );
						return;
					}
					let userS = messageReaction.message.guild.member( results[0].made_by );
					userS.send( Constants.Strings.COMMANDADDSUCCESS + prefix +  results[0].name )
					query = `UPDATE commands SET request_id=0 WHERE request_id='${messageReaction.message.id}' AND server_id=${messageReaction.message.guild.id}`;
					if( DEBUG )
						console.log( "built query: " + query );
					database.query( query, function( err, results ) { if(err) throw err; });
				} else {
					user.send( Constants.Strings.NOPERMREACTIONWARN );
					messageReaction.remove( user );
				}
			} else
				throw "what the fuck";
		});
		// reject
	} else if( messageReaction.message.channel.name == Constants.Strings.APPROVAL
		&& messageReaction.emoji == Constants.Strings.THUMBSDOWN 
		&& messageReaction.message.embeds.length > 0
		&& messageReaction.message.embeds[0].author.name.toLowerCase().includes("command") ) {
		let query = `SELECT * FROM commands WHERE request_id='${messageReaction.message.id}' AND server_id=${messageReaction.message.guild.id}`;
		if( DEBUG )
			console.log( "built query: " + query );
		database.query( query, function( err, results ) {
			if( err ) {
				messageReaction.message.channel.send( `Error encountered: \`\`\`\n${err.sqlMessage}\n\`\`\`` );
				return;
			}
			if( results.length > 0 ) {
				if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
					if( messageReaction.count > 2 ) {
						messageReaction.remove( user );
						user.send( Constants.Strings.ALREADYAPPROVED );
						return;
					}
					let userS = messageReaction.message.guild.member( results[0].made_by );
					userS.send( Constants.Strings.COMMANDADDFAILURE + prefix + results[0].name )
					query = `DELETE FROM commands WHERE request_id='${messageReaction.message.id}' AND server_id=${messageReaction.message.guild.id}`;
					if( DEBUG )
						console.log( "built query: " + query );
					database.query( query, function( err, results ) { if(err) throw err; });
				} else {
					user.send( Constants.Strings.NOPERMREACTIONWARN );
					messageReaction.remove( user );
				}
			} else
				throw "what the fuck";
		});
	}
	let value = htAccept.get( messageReaction.message.id );
	// sounds
	if( value !== undefined
		&& typeof value === "object"
		&& messageReaction.emoji == Constants.Strings.THUMBSUP
		&& user != client.user ) {
		if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
			let message = htAccept.get( messageReaction.message.id );
			let userS = message.author;
			let filename;
			message.attachments.forEach(( attachment ) => {
				filename = attachment.filename;
			});
			Commands.addSoundCommand( [], htAccept.get( messageReaction.message.id ), htAccept, true );
			userS.send( Constants.Strings.SOUNDADDSUCCESS + filename );
			htAccept.remove( messageReaction.message.id );
		} else {
			user.send( Constants.Strings.NOPERMREACTIONWARN );
			messageReaction.remove( user );
		}
	} else if ( value !== undefined
		&& typeof value === "object"
		&& messageReaction.emoji == Constants.Strings.THUMBSDOWN
		&& user != client.user ) {
			if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
				let message = htAccept.get( messageReaction.message.id );
				let userS = message.author;
				let filename;
				message.attachments.forEach(( attachment ) => {
					filename = attachment.filename;
				});
				userS.send( Constants.Strings.SOUNDADDFAILURE + filename );
				htAccept.remove( messageReaction.message.id );
			} else {
				user.send( Constants.Strings.NOPERMREACTIONWARN );
				messageReaction.remove( user );
			}
	}

	let vote = settings.get( "server " + Constants.Settings.VOTE );
	console.log( `vote: ${vote}`)
	if( vote ) {
		//////////////////// VOTE STUFF //////////////////////
		// find votes channel and set vars
		let votesChannel;
		let member = messageReaction.message.guild.member( user );
		let isBlind = messageReaction.message.content.includes("blind");
		messageReaction.message.guild.channels.forEach(( channel ) => {
			if( channel.name == Constants.Strings.VOTES )
				votesChannel = channel;
		});
		if( !votesChannel ) {
			console.log( "Couldn't find votes channel" );
			return;
		}

		if( messageReaction.message.channel.name == Constants.Strings.VOTES ) {
			if( messageReaction.emoji != Constants.Strings.THUMBSUP && messageReaction.emoji != Constants.Strings.THUMBSDOWN ) {
				user.send( Constants.Strings.NOTAPPROVEDEMOJI );
				messageReaction.remove( user );
				return;
			}
			let isDupeVote = false;
			// don't let user vote twice
			if( !htVotes.get( messageReaction.message.id + "users" ) ) {
				let arr = [user];
				htVotes.put( messageReaction.message.id + "users", arr );
			} else {
				let arr = htVotes.get( messageReaction.message.id + "users" )
				if( arr.includes( user ) )
					isDupeVote = true;
				arr.push( user );
				htVotes.put( messageReaction.message.id + "users", arr );
			}
			if( isDupeVote ) {
				user.send( Constants.Strings.CANNOTVOTETWICE );
				messageReaction.remove( user );
				return;
			}
			console.log( "Remembered users: " + htVotes.get( messageReaction.message.id + "users" ) );

			// save counts
			if( messageReaction.emoji == Constants.Strings.THUMBSUP ) {
				if( !htVotes.get( messageReaction.message.id + "count" ) )
					htVotes.put( messageReaction.message.id + "count", messageReaction.count-1 );
				else
					htVotes.put( messageReaction.message.id + "count", htVotes.get( messageReaction.message.id + "count" ) + 1 );
			} else if( messageReaction.emoji == Constants.Strings.THUMBSDOWN ) {
				if( !htVotes.get( messageReaction.message.id + "countdown" ) )
					htVotes.put( messageReaction.message.id + "countdown", messageReaction.count-1 );
				else
					htVotes.put( messageReaction.message.id + "countdown", htVotes.get( messageReaction.message.id + "countdown" ) + 1 );
			}
			if( isBlind ) {
				messageReaction.remove( user );
				user.send( "Your reaction has been removed because this is a blind vote. Your vote has still been counted.")
			}
			// vote pass
			let adminModCount = 0;
			votesChannel.members.forEach(( member ) => {
				if( !member.user.bot )
					adminModCount++;
			})
			let voteCount = htVotes.get( messageReaction.message.id + "count" );
			let downVoteCount = htVotes.get( messageReaction.message.id + "countdown" );
			console.log( `vote count: ${voteCount} and ${downVoteCount}` );
			if( htVotes.get( messageReaction.message.id ) 
				&& voteCount > (adminModCount/2) ) {
				messageReaction.message.channel.send( Constants.Strings.VOTEPASS );
				clearTimeout( htVotes.get( messageReaction.message.id ) );
				htVotes.remove( messageReaction.message.id );
				htVotes.remove( messageReaction.message.id + "count" );
				htVotes.remove( messageReaction.message.id + "countdown" );
				htVotes.remove( messageReaction.message.id + "users" );
				htVotes.remove( messageReaction.message.channel.id );
			// vote fail
			} else if( htVotes.get( messageReaction.message.id ) 
				&& downVoteCount > (adminModCount/2) ) {
				messageReaction.message.channel.send( Constants.Strings.VOTEFAIL );
				clearTimeout( htVotes.get( messageReaction.message.id ) );
				htVotes.remove( messageReaction.message.id );
				htVotes.remove( messageReaction.message.id + "count" );
				htVotes.remove( messageReaction.message.id + "countdown" );
				htVotes.remove( messageReaction.message.id + "users" );
				htVotes.remove( messageReaction.message.channel.id );
			// remove invalid votes
			} else if( !htVotes.get( messageReaction.message.id ) ) {
				user.send( Constants.Strings.VOTEINVALID );
				messageReaction.remove( user );
			}
		}
	}
});

client.on( "messageReactionRemove", (messageReaction, user) => {
	if( messageReaction.message.content.includes("blind") )
		return;

	if( messageReaction.message.channel.name == Constants.Strings.VOTES
		&& htVotes.get( messageReaction.message.id ) ) {
		let users = htVotes.get( messageReaction.message.id + "users" );
		users = users.filter(function(e) { return e != user } )
		htVotes.put( messageReaction.message.id + "users", users );
		if( messageReaction.emoji == Constants.Strings.THUMBSUP )
			htVotes.put( messageReaction.message.id + "count", htVotes.get( messageReaction.message.id + "count" ) - 1 );
		if( messageReaction.emoji == Constants.Strings.THUMBSDOWN )
			htVotes.put( messageReaction.message.id + "countdown", htVotes.get( messageReaction.message.id + "countdown" ) - 1 )
		console.log( "Remembered users: " + htVotes.get( messageReaction.message.id + "users" ) );
	} else if( messageReaction.message.channel.name == Constants.Strings.VOTES
		&& !htVotes.get( messageReaction.message.id ) )
			user.send( Constants.Strings.VOTEINVALID );
})

client.on( "voiceStateUpdate", (oldMember, newMember) => {
	if( !Commands.isManagedServer( newMember.guild ) )
		return;
	
	if( !oldMember.voiceChannel && newMember.voiceChannel )
		newMember.addRole( Commands.getRoleByNameGuild( newMember.guild, Constants.Strings.VOICEROLE ) );
	if( oldMember.voiceChannel && !newMember.voiceChannel ) {
		newMember.removeRole( Commands.getRoleByNameGuild( newMember.guild, Constants.Strings.VOICEROLE ) );
		if( oldMember.voiceChannel.members.array().length == 0 ) {
			let category = oldMember.voiceChannel.parent;
			let voiceChannel = category.children.find( 'name', 'voice' );
			if( !voiceChannel ) {
				console.log( "voice channel could not be found" );
				return;
			}
			let role = oldMember.guild.roles.find( 'name', 'VOICE' );
			let permission = voiceChannel.permissionOverwrites.find( 'id', role.id )
			// found that voiceChannel has voice role with read perms on
			if( permission.allow == 1024 ) {
				let numMessages = voiceChannel.messages.array().length;
				console.log( `deleting ${numMessages} messages` );
				voiceChannel.bulkDelete( numMessages );
			}
		}
	}
});

client.on( "error", (error) => {
	console.log( "Error encountered: " + error );
});

database.on( "error", (error) => {
	console.log( "mysql Error encountered: " + error );
});

rl.on('line', (input) => {
	let parts = input.split( ', ' );
	if( parts.length != 3 && parts.length != 1 ) {
		console.log( "Format your input in 3 parts: <server name>, <channel name>, <message>, or 1 part: <message>.");
		return;
	}
	let text = parts[0];
	let server = parts[1];
	let channel = parts[2];
	Commands.sendMessage( client, text, server, channel );
});

/**
 * Processes commands. This function is called when a message starting with the prefix is seen.
 * @param {string} receivedMessage - A message sent to any channel in any server that starts with the prefix, Constants.Strings.PREFIX
 */
function processCommand( receivedMessage, htSettings ) {
	// get second to last message
	let secondToLastMessage = htSecondToLastMessages.get( receivedMessage.author.id );
	// remove prefix
	let fullCommand;
	let mentioned = receivedMessage.content.startsWith( `<@${client.user.id}>` );
	if( mentioned )
		fullCommand = receivedMessage.content.substr( client.user.id.length+4 )
	else
		fullCommand = receivedMessage.content.substr(1);
    // split command into pieces
    let splitCommand = fullCommand.split(" ")
    // the first command in the split command is the name of the command
    let command = splitCommand[0].toLowerCase();
    // the other commands in the split command are argumentCommands
	let argumentCommands = splitCommand.slice(1);
    // Clean punctuation from argumentCommands
	let argumentCommandsRemovePunctuation = Commands.clean( argumentCommands );

	// Same process as before but with clean message. Good for custom commands.
	let fullCommandClean;
	if( receivedMessage.content.startsWith( `<@${client.user.id}>` ) )
		fullCommandClean = receivedMessage.cleanContent.substr( client.user.username.length+2 );
	else
		fullCommandClean = receivedMessage.cleanContent.substr(1);
	let splitCommandClean = fullCommandClean.split(" ");
	let argumentCommandsClean = splitCommandClean.slice(1);

	// console logs
    console.log( "Received Command: " + command )
	console.log( "Args: " + argumentCommandsClean )

	if( receivedMessage.channel.name == Constants.Strings.AGREEMENT ) {
		if( command == Constants.Commands.AGREE )
			Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, argumentCommandsRemovePunctuation, receivedMessage, htNewMembers, 1 );
		return;
	}

	let prefix = htSettings.get( "user " + Constants.Settings.PREFIX );
	let disabledCommands = htSettings.get( "server command: " );

	if( !receivedMessage.member.hasPermission(Constants.Permissions.ADMIN) && disabledCommands.includes(command) ) {
		receivedMessage.channel.send( `The command \`${prefix+command}\` is disabled.`)
		return;
	} else if( receivedMessage.member.hasPermission(Constants.Permissions.ADMIN) && disabledCommands.includes(command) )
		receivedMessage.react( Constants.Strings.FIRE );

    switch( command ) {
		case Constants.Commands.HELP:
			if( mentioned )
				receivedMessage.channel.send( `Your prefix is \`${prefix}\`` );
			else
            	Help.helpCommand( argumentCommands, receivedMessage, false, client, prefix );
            break;
        case Constants.Commands.PING:
            Commands.pingCommand( argumentCommands, receivedMessage, client );
            break;
		case Constants.CommandSynonyms.ADD:
		case Constants.CommandSynonyms.REMOVE:
		case Constants.CommandSynonyms.LIST:
			if( argumentCommandsClean[0] == Constants.Commands.ROLE ) {
				let temp = command;
				command = Constants.Commands.ROLE;
				argumentCommandsClean[0] = temp;
			}
			Commands.roleCommand( argumentCommandsClean, receivedMessage, client, prefix );
			break;
		case Constants.CommandSynonyms.ADDROLE:
			argumentCommandsClean.unshift("add");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, client, prefix );
			break;
		case Constants.CommandSynonyms.REMOVEROLE:
			argumentCommandsClean.unshift("remove");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, client, prefix );
			break;
		case Constants.CommandSynonyms.ROLES:
			argumentCommandsClean.unshift("list");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, client, prefix );
			break;
        case Constants.Commands.ROLE:
            Commands.roleCommand( argumentCommandsRemovePunctuation, receivedMessage, client, prefix );
			break;
		case Constants.Commands.SCHEDULE:
			Commands.scheduleCommand( fullCommand.split(Constants.Strings.COMMANDSPLITTER), receivedMessage, client, prefix );
			break;
        case Constants.Commands.MUTE:
            Commands.muteCommand( argumentCommands, receivedMessage, undefined, undefined, client, prefix );
            break;
		case Constants.Commands.UNMUTE:
			Commands.muteCommand( argumentCommands, receivedMessage, true, false, client, prefix );
			break;
		case Constants.Commands.IGNORE:
			Commands.ignoreCommand( argumentCommands, receivedMessage, htIgnoredUsers, client, prefix );
			break;
		case Constants.Commands.AGREE:
			Commands.agreeCommand( Mailgun, "", argumentCommands, receivedMessage, htNewMembers, 4 );
			break;
		case Constants.Commands.EIGHTBALL:
			Commands.eightBallCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.Commands.LOVE:
			Commands.loveCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.Commands.ROLL:
			Commands.rollCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.Commands.WOOF:
			Commands.woofCommand( argumentCommands, receivedMessage, breeds );
			break;
		case Constants.CommandSynonyms.EXEC:
		case Constants.Commands.EXECUTE:
			Commands.executeCommand( argumentCommands, receivedMessage, execSync, client, prefix );
			break;
		case Constants.Commands.PLAY:
			Commands.playCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.Commands.ADDSOUND:
			Commands.addSoundCommand( argumentCommands, receivedMessage, htAccept, false, client, prefix );
			break;
		case Constants.Commands.LEAVE:
			Commands.leaveCommand( argumentCommands, receivedMessage );
			break;
		case Constants.CommandSynonyms.ADDCOMMAND:
			argumentCommandsClean.unshift("add");
			Commands.commandCommand( argumentCommandsClean, receivedMessage, mysql, database, prefix, client, EmojiConvertor );
			break;
		case Constants.CommandSynonyms.DELETECOMMAND:
			argumentCommandsClean.unshift("delete");
			Commands.commandCommand( argumentCommandsClean, receivedMessage, mysql, database, prefix, client, EmojiConvertor );
			break;
		case Constants.CommandSynonyms.LISTCUSTOMCOMMANDS:
		case Constants.CommandSynonyms.LCC:
			argumentCommandsClean.unshift("list");
			Commands.commandCommand( argumentCommandsClean, receivedMessage, mysql, database, prefix, client, EmojiConvertor );
			break;
		case Constants.Commands.COMMAND:
			Commands.commandCommand( argumentCommandsClean, receivedMessage, mysql, database, prefix, client, EmojiConvertor );
			break;
		case Constants.Commands.GIVEPERMSALL:
			Commands.givePermsAllCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.LISTADMINCOMMANDS:
		case Constants.CommandSynonyms.LAC:
			Help.helpCommand( argumentCommands, receivedMessage, true, client, prefix );
			break;
		case Constants.CommandSynonyms.LCC:
		case Constants.Commands.QUOTE:
			Commands.quoteCommand( argumentCommands, receivedMessage, client, mysql, database, prefix );
			break;
		case Constants.Commands.QUOTES:
			Commands.quotesCommand( argumentCommands, receivedMessage, database, client, prefix );
			break;
		case Constants.Commands.QUERY:
			Commands.queryCommand( argumentCommands, receivedMessage, database, client, prefix );
			break;
		case Constants.Commands.FILTER:
			Commands.filterCommand( argumentCommands, receivedMessage, filterWords, client, prefix );
			break;
		case Constants.Commands.WARN:
			Commands.warnCommand( fullCommand.split(Constants.Strings.COMMANDSPLITTER), receivedMessage, client, mysql, database, prefix );
			break;
		case Constants.Commands.WARNS:
			Commands.warnsCommand( argumentCommands, receivedMessage, database, client, prefix );
			break;
		case Constants.Commands.ECHO:
			Commands.echoCommand( argumentCommandsClean, receivedMessage );
			break;
		case Constants.Commands.NICK:
			Commands.nickCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.PURGE:
			Commands.purgeCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.SETTINGS:
			Commands.settingsCommand( argumentCommands, receivedMessage, database, client, prefix, htSettings );
			break;
		case Constants.Commands.UPDATERULES:
			Commands.updaterulesCommand( argumentCommands, receivedMessage, mysql, database );
			break;
		case Constants.Commands.WHOAMI:
			Commands.whoamiCommand( argumentCommands, receivedMessage, client );
			break;
		case Constants.Commands.LASTCOMMAND:
			if( secondToLastMessage )
                processCommand( secondToLastMessage, htSettings );
			break;
		default:
			let query = `SELECT message FROM commands WHERE name=\'${command}\' AND request_id=0`;
			if( DEBUG )
				console.log( "built query: " + query );
			database.query( query, function(err, results) {
				if( err ) {
					msg.channel.send( `Error encountered: \`\`\`\n${err.sqlMessage}\n\`\`\`` );
					return;
				}
				if( results[0] ) {
						let message = results[0].message;
					receivedMessage.channel.send( `${message} ${argumentCommandsClean.join(" ")}` )
					.then( msg => {
						msg.react( Constants.Strings.WRENCH );
					});
				}
			});
	}
	if( command != Constants.Commands.LASTCOMMAND ) {
		if( secondToLastMessage )
			htSecondToLastMessages.remove( receivedMessage.author.id );
		htSecondToLastMessages.put( receivedMessage.author.id, receivedMessage );
	}
}

/**
 * Returns true if a message says that I won a giveaway :(
 * @param {@link Message} msg - The {@link Message} to check if I won a giveaway.
 * @returns {boolean} 
 */
function rutgersChan( msg ) {
	if ( msg.content.toLowerCase().includes("rutgers")
	&& msg.content.toLowerCase().includes("chan") ) {
		let random = Math.random()
		if( random < 0.9 ) {
			let emote = Constants.HEARTEMOTES[Math.floor(Math.random()*Constants.HEARTEMOTES.length)];
			msg.react( emote );
		} else
			msg.channel.send( "Oh? The busses don't come on time? Too fucking bad!" );
	}
}

function getChannelByName( msg, name ) {
    let retChannel;

    msg.guild.channels.forEach(( channel ) => {
        if( channel.name == name && channel.type == 'text' )
            retChannel = channel;
    });

    return retChannel;
}

function numToEmoteArray( num ) {
	let emoteArray = [];
	let numArr = num.toString().split("");
	// console.log( "numArr: " + numArr.join(", ") );
	for( let i = 0; i < numArr.length; i++ )
		for( let j = 0; j < numArr.length; j++ )
			if( i != j && numArr[i] == numArr[j] ) {
				console.log( "defaulted on chain; duplicate found" );
				emoteArray.push( Constants.Strings.DEFAULT );
				return emoteArray;
			}
	numArr.forEach(( numTemp ) => {
		numTemp = +numTemp;
		let emoteToPush;
		// console.log( "numTemp: " + numTemp );
		// console.log( "typeof: " + typeof numTemp );
		switch( numTemp ) {
			case 0: emoteToPush = Constants.Strings.ZERO; break;
			case 1: emoteToPush = Constants.Strings.ONE; break;
			case 2: emoteToPush = Constants.Strings.TWO; break;
			case 3: emoteToPush = Constants.Strings.THREE; break;
			case 4: emoteToPush = Constants.Strings.FOUR; break;
			case 5: emoteToPush = Constants.Strings.FIVE; break;
			case 6: emoteToPush = Constants.Strings.SIX; break;
			case 7: emoteToPush = Constants.Strings.SEVEN; break;
			case 8: emoteToPush = Constants.Strings.EIGHT; break;
			case 9: emoteToPush = Constants.Strings.NINE; break;
			default: emoteToPush = Constants.Strings.DEFAULT;
		}
		emoteArray.push( emoteToPush );
	});
	return emoteArray;
}

function splitBySplitter( string ) {
	let stringArr = string.split(Constants.Strings.COMMANDSPLITTER);
	stringArr[0] = stringArr[0].split(" ").slice(1);
	return stringArr;
}

async function generatePresence( which ) {
	let views = -1;
	if( twitchClient ) {
		let myChannel = await twitchClient.kraken.channels.getChannel('81840902');
		views = myChannel.views;
	}
	let names = [
		`${getNumLines()} lines of code!`,
		`${views} views on Twitch!`,
		`Version ${Constants.VERSION}`,
		`${Constants.Strings.PREFIX}whoami`,
		`<3 Rutgers-Chan`,
	];
	let data = {
		name: names[which],
		type: "PLAYING",
		url: Constants.TWITCH_URL,
	}
	let presence = new Discord.Game(data,client.user.presence);
	let hours = 0;
	let minutes = 1;
	let seconds = 0;
	let milliseconds = hours*3600000 + minutes*60000 + seconds*1000;
	client.user.setPresence({ game: presence });
	if( (which + 1) > names.length )
		setTimeout( generatePresence, milliseconds, 0 );
	else
		setTimeout( generatePresence, milliseconds, which + 1 );
}

function getNumLines() {
	let cmdOut = execSync('git ls-files | grep -E \'^custom_modules|^main.js$\' | xargs wc -l', { encoding: 'utf-8' }).split(" ");
	let numLines = cmdOut[cmdOut.length-2];
	return +numLines;
}

client.login(API_Keys.discord_bot_secret_token)
