/**
 * @fileOverview This is the main.js file for the Rutgers Esports Discord Bot. This file processes commands and contains "Command" functions which reply to messages that start with a previously designated prefix. It also contains helper methods for said functions.
 *
 * @author Arjun Srivastav
 *
 * @requires NPM:discord.js
 * @requires custom_modules/constants.js:Constants
 */

// EXPERIMENTAL BOT USER?
const EXPERIMENTAL = false;

// imports
const Discord = require('discord.js')
const client = new Discord.Client({disableEveryone:true})
const { Client, RichEmbed } = require('discord.js')
const Constants = require( './custom_modules/Constants.js' )

// DEBUG
const DEBUG = Constants.DEBUG;
////////

const Commands = require( './custom_modules/Commands.js' )
var API_Keys = EXPERIMENTAL ? require( './custom_modules/API_keys_experimental.js') : require('./custom_modules/API_keys.js');
const Help = require('./custom_modules/Help.js');
const mg = require('mailgun').Mailgun;
const Mailgun = new mg(API_Keys.mailgun_api_key);
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
var filterWords = Commands.filterWords;
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
const TwitchClient = require('twitch').default;
const twitchClient = TwitchClient.withClientCredentials(API_Keys.twitch_client_id, API_Keys.twitch_client_secret);
// tiffany typing message
var isTiffanyTimerSet = false;

client.on('ready', async () => {
	console.log( "Connected as " + client.user.tag );
	generatePresence(0);
	if( database ) console.log( `Database connection established` );
})

//EVENTS
client.on( 'message', (receivedMessage, settings) => {
    // This stops the bot from replying to itself or other bots
    if( receivedMessage.author == client.user || receivedMessage.author.bot )
		return;

	// this block is for the email verification stuff.
	if( receivedMessage.channel.type == 'dm' ) {
		// check if user is kate or not kate and respond appropriately
		let query = "SELECT * FROM kate;"
		if( DEBUG )
			console.log( "built query: " + query );
		database.query( query, function( err, results ) {
			if( Commands.errHandler( err, receivedMessage ));
			// check if user is kate
			if( results.length != 1 ) {
				receivedMessage.author.send( "This wasn't supposed to happen D: Please contact Arjun!" );
			} else {
				if( DEBUG )
					console.log( `DEBUG INFO: resultsIdentity: ${results[0].identity}, received identity: ${receivedMessage.author.id}, firstTime?: ${results[0].firstTime}` );
				// this user is kate and it's her first time using me!
				if( results[0].identity == receivedMessage.author.id && results[0].firstTime == 0) {
					// this is kate's first time using this interface, so send a first time message
					receivedMessage.author.send( Constants.Strings.KATEFIRSTTIMEMSG );
					let query = "UPDATE kate SET firstTime=1;"
					if( DEBUG )
						console.log( "built query: " + query );
					database.query( query, function( err, results ) { if( Commands.errHandler( err, receivedMessage )); });
				// this user is kate, it's not her first time, and she said "hey" so we'll start treating her like Kate until she says "bye"
				} else if( results[0].identity == receivedMessage.author.id && receivedMessage.cleanContent.toLowerCase() == "hey" ) {
					// kate mode on and attempting to turn it on again
					if( results[0].kateMode == 1 )
						receivedMessage.author.send( "Kate mode is already on but I'll turn it on again for you! *boop*" );
					else { // kate mode off, turning on
						receivedMessage.author.send( "Kate mode is on!" );
						query = "UPDATE kate SET kateMode=1;"
						if( DEBUG )
							console.log( "built query: " + query );
						database.query( query, function( err, results ) { if( Commands.errHandler( err, receivedMessage ) ) return; });
					}
				} else if( results[0].identity == receivedMessage.author.id && receivedMessage.cleanContent.toLowerCase() == "bye" ) {
					if( results[0].kateMode == 0 )
						receivedMessage.author.send( "Kate mode is off, but I'll turn it off again. :(" );
					else {
						receivedMessage.author.send( "Leaving Kate mode! Bye... :(" );
						query = "UPDATE kate SET kateMode=0;"
						if( DEBUG )
							console.log( "built query: " + query );
						database.query( query, function( err, results ) { if( Commands.errHandler( err, receivedMessage ) ) return; });
					}
					// this is kate and kate mode is on. This is where the interesting stuff is.
				} else if( results[0].identity == receivedMessage.author.id && results[0].kateMode == 1 ) {
					// if the message includes arjun get a random picture of me
					if( receivedMessage.cleanContent.toLowerCase().includes("arjun") ) {
						// get number of files in the arjun photos folder.
						let fileCount = execSync( 'ls -l /root/Rutgers-kun/resources/arjunphotos | wc -l' );
						fileCount = fileCount - 1;
						// output a random photo from that folder
						let filenum = Commands.generateRandom( 0, fileCount - 1 );
						receivedMessage.author.send({
							files: [ `/root/Rutgers-kun/resources/arjunphotos/image${filenum}.jpg` ]
						})
					} else if( receivedMessage.cleanContent.toLowerCase().includes("boomer") )
						receivedMessage.author.send("okay :(");
					else if( receivedMessage.cleanContent.toLowerCase().includes("i love you") )
						receivedMessage.author.send("I love you too! " + Constants.HEARTEMOTES[Commands.generateRandom(0,Constants.HEARTEMOTES.length-1)]);
					else if( receivedMessage.cleanContent.toLowerCase().includes("meme") ) {
						// get random meme from folder and send that
						let files = execSync( 'ls /root/Rutgers-kun/resources/kateMemes/' );
						files = files.toString().split('\n');
						let file = '/root/Rutgers-kun/resources/kateMemes/';
						file += files[Commands.generateRandom(0,files.length-1)];
						receivedMessage.author.send({
							files: [ file ]
						});
					} else if( receivedMessage.cleanContent.toLowerCase().includes("help") )
						receivedMessage.author.send( Constants.Strings.KATEHELP );
					else // random kate message
						receivedMessage.author.send( Constants.KATEMESSAGES[Commands.generateRandom(0,Constants.KATEMESSAGES.length)] );
				} else { // this user is not kate!
					let DMEmbed = new RichEmbed()
						.setAuthor( "DM Received from:", client.user.displayAvatarURL )
						.setTitle( receivedMessage.author.tag )
						.setColor(0xFF0000)
						.setThumbnail( receivedMessage.author.displayAvatarURL )
						.setFooter( Constants.Strings.TIMESTAMP + receivedMessage.createdAt );
					if( receivedMessage.content )
						DMEmbed.addField( "Contents:", receivedMessage.content )
					let i = 1;
					receivedMessage.attachments.forEach(( attachment ) => {
						DMEmbed.addField(  "**Attachment " + i + ":**\nFilename: " + attachment.filename, attachment.proxyURL )
						i++;
					});
					DMEmbed.addField( "User ID: ", receivedMessage.author.id );
					Commands.sendMessage( client, DMEmbed, "Rutgers Esports", "botlog" );
					if( receivedMessage.content.endsWith( Constants.Strings.SCHOOL.toLowerCase() + ".edu" )  )
						Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, [], receivedMessage, htNewMembers, 2 );
					else if( receivedMessage.content.endsWith( ".com" ) )
						receivedMessage.channel.send( Constants.Strings.RUTGERSEMAILPLS );
					else
						Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, [], receivedMessage, htNewMembers, 3 );
					return;
				}
			}
		});
		return;
	}

	// settings that update per message
	if( !settings ) {
		Commands.getSettings( receivedMessage, null, null, null, "message", database, client );
		return;
	}
	let prefix = settings.get( "user " + Constants.Settings.PREFIX );
	let isChain = settings.get( "server " + Constants.Settings.ISCHAIN );
	let disabledCommands = settings.get( "command: " );
	let transactionChannelId = settings.get( "transaction " );

	// Check if user is in #agreement channel first
	// this happens before processCommand because we only want the user to be able to use !agree
	// if they are in the agreement channel
	if( receivedMessage.channel.name == Constants.Strings.AGREEMENT ) {
		receivedMessage.delete();
		processCommand( receivedMessage, settings );
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

	// automute users if they mention any role and they have no perms.
	let query = "SELECT role FROM rolePingExcepts;";
	if( DEBUG )
		console.log( "built query: " + query );
	database.query( query, function( err, results ) {
		if( receivedMessage.member === undefined || receivedMessage.member == null )
			return;
		if( !receivedMessage.member.hasPermission( Constants.Permissions.MENTIONEVERYONE ) ) {
		let atLeastOneRoleMentioned = false;
		let roleMentioned = "undefined";
		let roleObjMentioned;
		receivedMessage.mentions.roles.forEach(( role ) => {
			if( !role.hasPermission( Constants.Permissions.KICKMEMBERS, false, true ) ) {
				roleMentioned = role.name;
				roleObjMentioned = role;
				atLeastOneRoleMentioned = true;
			}
		});
		for( let i = 0; i < results.length; i++ ) {
			let result = results[i];
			if( roleObjMentioned && result.role == roleObjMentioned.id )
				return;
		}
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
	});

	// refetch filter words from commands
	filterWords = Commands.filterWords;

	// word filtering
	if( Commands.isManagedServer( receivedMessage.guild ) ) {
		for( let i = 0; i < filterWords.length; i++ ) {
			filterWord = filterWords[i];
			if( receivedMessage.content.toLowerCase().search( filterWord ) != -1 && receivedMessage.member.hasPermission( Constants.Permissions.KICKMEMBERS ) )
				receivedMessage.react( Constants.Strings.FIRE );
			else if( receivedMessage.content.toLowerCase().search( filterWord ) != -1 ) {
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
	// hit that fat reroll
	reroll( receivedMessage );

	// word counter
	query = mysql.format('SELECT user,word,count FROM wordCounters WHERE user=?', receivedMessage.author.id);
	if( DEBUG )
		console.log( "built query: " + query );
	database.query( query, function( err, results ) {
		if( Commands.errHandler( err, receivedMessage ) ) return;
		for( let i = 0; i < results.length; i++ ) {
			let user = results[i].user;
			let word = results[i].word;
			let count = results[i].count;
			// console.log( "comparing " + receivedMessage.content.toLowerCase() + " to " + word );
			if( receivedMessage.author.id == user && receivedMessage.content.toLowerCase().includes(word) ) {
				let content = receivedMessage.content.toLowerCase();
				let wordCount = (content.match(new RegExp(word,"g")) || []).length
				receivedMessage.channel.send( `${receivedMessage.author.username}'s \`${word}\` counter: ${count+wordCount}`);
				query = mysql.format(`UPDATE wordCounters SET count=count+? WHERE user=? AND word=?`, [wordCount,receivedMessage.author.id,word]);
				if( DEBUG )
					console.log( "built query: " + query );
				database.query( query, function( err, results ) {
					if( Commands.errHandler( err, receivedMessage ) ) return;
				});
			}
		}
	});

	if( receivedMessage.channel.id == transactionChannelId )
		Commands.processTransaction( receivedMessage, database, mysql, client );

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
			&& secondToLastMessage.cleanContent == receivedMessage.content
			&& receivedMessage.content != "" ) {
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
			let count = htChainCounter.get( receivedMessage.channel.id );
			if( count > 2 ) {
				receivedMessage.react( Constants.Strings.ANGRY );
				let query = "SELECT * FROM chainHighscores WHERE server=?";
				query = mysql.format( query, [receivedMessage.guild.id] );
				if( DEBUG )
					console.log( "built query: " + query );
				database.query( query, function( err, results ) {
					if( Commands.errHandler( err, receivedMessage ) ) return;
					if( results.length == 0 || results[0].size < count ) {
						let query = "INSERT INTO chainHighscores values( ?,?,?,?,?,null ) ON DUPLICATE KEY UPDATE channel=?, breaker=?, message=?, size=?";
						query = mysql.format( query,
							[
								receivedMessage.guild.id,
								receivedMessage.channel.id,
								receivedMessage.member.user.id,
								secondToLastMessage.cleanContent,
								count,
								receivedMessage.channel.id,
								receivedMessage.member.user.id,
								secondToLastMessage.cleanContent,
								count
							]
						);
						if( DEBUG )
							console.log( "built query: " + query );
						database.query( query, function( err, results ) { if( Commands.errHandler( err, receivedMessage ) ) return; });
						receivedMessage.channel.send( `NEW HIGHSCORE for server \`${receivedMessage.guild.name}\` with message \`${secondToLastMessage.cleanContent}\` of length \`${count}\`!`);
					}
				});
			}
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

	database.query( "SELECT user,server FROM filteredFromLive", function( err, results ) {
		let isOnList = false;
		results.forEach(( result ) => {
			if( result.user == newGuildMember.user.id && result.server == newGuildMember.guild.id )
				isOnList = true;
		})
		if( !isOnList ) {
			if( !oldIsStreaming && newIsStreaming )
				newGuildMember.addRole( Commands.getRoleByNameGuild( newGuildMember.guild, Constants.Strings.LIVEROLE ) );
			if( oldIsStreaming && !newIsStreaming )
				newGuildMember.removeRole( Commands.getRoleByNameGuild( newGuildMember.guild, Constants.Strings.LIVEROLE ) );
		}
	});
});

client.on( "typingStart", (channel, user) => {
	if( channel.name == "shitposting2" && user.id == "144264540484403200" && !isTiffanyTimerSet ) {
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
	
	if( !settings ) {
		Commands.getSettings( messageReaction.message, null, messageReaction, user, "messageReactionAdd", database, client );
		return;
	}

	let log = settings.get( "server " + Constants.Settings.ISLOG );

	// delete bot messages with a reaction
	if( messageReaction.message.author.bot
		&& messageReaction.emoji == Constants.Strings.NOENTRY
		&& !messageReaction.message.mentions.everyone
		&& messageReaction.message.mentions.members.array().length == 0
		&& messageReaction.message.mentions.roles.array().length == 0 ) {
		if( log ) {
		let msg = messageReaction.message;
			let auditChannel = getChannelByName( msg, Constants.Strings.AUDIT );
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
		}
		messageReaction.message.delete();
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
			// if( err ) {
			// 	messageReaction.message.channel.send( `Error encountered: \`\`\`\n${err.sqlMessage}\n\`\`\`` );
			// 	return;
			// }
			if( Commands.errHandler( err, messageReaction.message ) ) return;
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
			}
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
			if( Commands.errHandler( err, messageReaction.message ) ) return;
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
			}
		});
	}
	let value = htAccept.get( messageReaction.message.id );
	let member = messageReaction.message.member;
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
	value = htAccept.get( "emote " + messageReaction.message.id );
	// emotes
	if( value !== undefined
		&& typeof value === "object"
		&& messageReaction.emoji == Constants.Strings.THUMBSUP
		&& user != client.user ) {
		if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
			let message = value;
			let userS = message.author;
			let filename;
			message.attachments.forEach(( attachment ) => {
				filename = attachment.filename;
			});
			let emoteName = htAccept.get( "emote name " + messageReaction.message.id );
			let name = ":" + emoteName + ":";
			Commands.addEmoteCommand( [emoteName], value, htAccept, true, client );
			userS.send( Constants.Strings.EMOTEADDSUCCESS + name );
			htAccept.remove( "emote " + messageReaction.message.id );
		} else {
			user.send( Constants.Strings.NOPERMREACTIONWARN );
			messageReaction.remove( user );
		}
	} else if ( value !== undefined
		&& typeof value === "object"
		&& messageReaction.emoji == Constants.Strings.THUMBSDOWN
		&& user != client.user ) {
			if( member.hasPermission( Constants.Permissions.KICKMEMBERS ) ) {
				let message = htAccept.get( "emote " + messageReaction.message.id );
				let userS = message.author;
				let filename;
				message.attachments.forEach(( attachment ) => {
					filename = attachment.filename;
				});
				if( htAccept.get( "emote name " + messageReaction.message.id ) )
					filename = htAccept.get( "emote name " + messageReaction.message.id );
				let name = ":" + filename.match(/[^.]*/g)[0] + ":";
				userS.send( Constants.Strings.EMOTEADDFAILURE + name );
				htAccept.remove( "emote " + messageReaction.message.id );
			} else {
				user.send( Constants.Strings.NOPERMREACTIONWARN );
				messageReaction.remove( user );
			}
	}

	let vote = settings.get( "server " + Constants.Settings.VOTE );
	if( DEBUG )
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
			if( DEBUG )
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
		if( DEBUG )
			console.log( "Remembered users: " + htVotes.get( messageReaction.message.id + "users" ) );
	} else if( messageReaction.message.channel.name == Constants.Strings.VOTES
		&& !htVotes.get( messageReaction.message.id ) )
			user.send( Constants.Strings.VOTEINVALID );
});

client.on( "guildMemberUpdate", (oldGuildMember, newGuildMember) => {
	if( newGuildMember.user.bot )
		return;
	
	// detect role update
	if( !oldGuildMember.roles.equals( newGuildMember.roles ) ) {
		let role = newGuildMember.roles.filter( newRole => !oldGuildMember.roles.array().includes(newRole) );
		if( role.array().length > 0 ) {
			role = role.first();
			let query = "SELECT message FROM roleResponses WHERE role_id=?";
			query = mysql.format( query, [role.id] );
			if( DEBUG )
				console.log( "built query: " + query );
			database.query( query, function( err, results ) {
				if( Commands.errHandler( err ) ) return;
				if( results.length > 0 )
					newGuildMember.user.send( results[0].message );
			})
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
	let prefix = htSettings.get( "user " + Constants.Settings.PREFIX );
	let disabledCommands = htSettings.get( "server command: " );
	if( disabledCommands.includes(Constants.Commands.EXECUTE) )
		disabledCommands.push( Constants.CommandSynonyms.EXEC );
	if( disabledCommands.includes(Constants.Commands.COMMAND ) ) {
		disabledCommands.push( Constants.CommandSynonyms.ADDCOMMAND );
		disabledCommands.push( Constants.CommandSynonyms.DELETECOMMAND );
	}
	let isManagedServer = Commands.isManagedServer( receivedMessage.guild );
	
	// get second to last message
	let secondToLastMessage = htSecondToLastMessages.get( receivedMessage.author.id );
	// remove prefix
	let fullCommand;
	let mentioned = receivedMessage.content.startsWith( `<@${client.user.id}>` );
	if( mentioned )
		fullCommand = receivedMessage.content.substr( client.user.id.length+4 )
	else
		fullCommand = receivedMessage.content.substr(prefix.length);
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

	// agreement stuff
	if( receivedMessage.channel.name == Constants.Strings.AGREEMENT ) {
		let query = `SELECT word FROM autoverify`;
		if( DEBUG )
			console.log( "built query: " + query );
		database.query( query, function( err, results ) {
			results.forEach(( result ) => {
				word = result.word;
				if( word == receivedMessage.cleanContent.toLowerCase() )
					Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, argumentCommandsRemovePunctuation, receivedMessage, htNewMembers, 1, true );
			})
			if( command == Constants.Commands.AGREE )
				Commands.agreeCommand( Mailgun, API_Keys.mailgun_domain, argumentCommandsRemovePunctuation, receivedMessage, htNewMembers, 1 );
		})
		return;
	}
	
	if( !receivedMessage.member.hasPermission(Constants.Permissions.KICKMEMBERS) && disabledCommands.includes(command) ) {
		receivedMessage.channel.send( `The command \`${prefix+command}\` is disabled.`)
		return;
	} else if( receivedMessage.member.hasPermission(Constants.Permissions.ADMIN) && disabledCommands.includes(command) )
		receivedMessage.react( Constants.Strings.FIRE );

    switch( command ) {
		case Constants.Commands.HELP:
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
			Commands.roleCommand( argumentCommandsClean, receivedMessage, isManagedServer, client, prefix );
			break;
		case Constants.CommandSynonyms.ADDROLE:
			argumentCommandsClean.unshift("add");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, isManagedServer, client, prefix );
			break;
		case Constants.CommandSynonyms.REMOVEROLE:
			argumentCommandsClean.unshift("remove");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, isManagedServer, client, prefix );
			break;
		case Constants.CommandSynonyms.ROLES:
			argumentCommandsClean.unshift("list");
			Commands.roleCommand( argumentCommandsClean, receivedMessage, isManagedServer, client, prefix );
			break;
        case Constants.Commands.ROLE:
            Commands.roleCommand( argumentCommandsRemovePunctuation, receivedMessage, isManagedServer, client, prefix );
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
		case Constants.Commands.MEOW:
			Commands.meowCommand( argumentCommands, receivedMessage );
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
		case Constants.Commands.ADDEMOTE:
			Commands.addEmoteCommand( argumentCommands, receivedMessage, htAccept, false, client, prefix );
			return;
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
		case Constants.CommandSynonyms.UNFILTER:
			argumentCommands.unshift("remove");
			Commands.filterCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.CommandSynonyms.FILTERS:
			argumentCommands.unshift("list");
		case Constants.Commands.FILTER:
			Commands.filterCommand( argumentCommands, receivedMessage, client, prefix );
			break;
		case Constants.Commands.WARN:
			Commands.warnCommand( fullCommand.split(Constants.Strings.COMMANDSPLITTER), receivedMessage, client, mysql, database, prefix );
			break;
		case Constants.Commands.WARNS:
			Commands.warnsCommand( argumentCommands, receivedMessage, database, client, prefix );
			break;
		case Constants.Commands.ECHO:
			Commands.echoCommand( argumentCommandsClean, receivedMessage, client, prefix );
			break;
		case Constants.Commands.NICK:
			Commands.nickCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.PURGE:
			Commands.purgeCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.CHAIN:
			Commands.chainCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.SETTINGS:
			Commands.settingsCommand( argumentCommands, receivedMessage, database, client, prefix, htSettings );
			break;
		case Constants.Commands.UPDATERULES:
			Commands.updaterulesCommand( argumentCommands, receivedMessage, mysql, database );
			break;
		case Constants.Commands.FILTERFROMLIVE:
			Commands.filterFromLiveCommand( argumentCommands, receivedMessage, mysql, database );
			break;
		case Constants.Commands.DM:
			Commands.dmCommand( argumentCommands, receivedMessage );
			break;
		case Constants.Commands.SETWORD:
			Commands.setWordCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.SETROLERESPONSE:
			Commands.setRoleResponseCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.SETPINGEXCEPTION:
			Commands.setPingExceptionCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.SETAUTOVERIFY:
			Commands.setAutoVerifyCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.SETTRANSACTIONCHANNEL:
			Commands.setTransactionChannelCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.DJS:
			Commands.djsCommand( argumentCommands, receivedMessage, client, database, mysql, prefix );
			break;
		case Constants.Commands.WHOAMI:
			Commands.whoamiCommand( argumentCommands, receivedMessage, client );
			break;
		case Constants.Commands.LASTCOMMAND:
			if( mentioned ) {
				receivedMessage.channel.send( `Your prefix is ${prefix}` );
				break;
			}
			break;
		default:
			let query = `SELECT message FROM commands WHERE name=\'${command}\' AND request_id=0  AND server_id=${receivedMessage.guild.id}`;
			if( DEBUG )
				console.log( "built query: " + query );
			database.query( query, function(err, results) {
				if( Commands.errHandler( err, receivedMessage ) ) return;
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
	if ( msg.content.toLowerCase().includes("rutgerschan")
		|| msg.content.toLowerCase().includes("rutgers-chan") ) {
		let random = Math.random()
		if( random < 0.9 ) {
			let emote = Constants.HEARTEMOTES[Math.floor(Math.random()*Constants.HEARTEMOTES.length)];
			msg.react( emote );
		} else
			msg.channel.send( "Oh? The busses don't come on time? Too fucking bad!" );
	}
}

function reroll( msg ) {
	let message = msg.content.toLowerCase();
	if( message.includes('arjun') && (message.includes('won') || message.includes('win')) && message.includes('giveaway') ) {
		let random = Math.random()
		if( random < 0.9 )
			msg.channel.send( 'I hit that fat reroll' );
		else
			msg.channel.send({ files: [ 'resources/reroll.png' ] });
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
				if( DEBUG )
					console.log( "defaulted on chain; duplicate found" );
				emoteArray.push( Constants.Strings.DEFAULT );
				return emoteArray;
			}
	numArr.forEach(( numTemp ) => {
		numTemp = +numTemp;
		let emoteToPush;
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
	let minutes = 2;
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
