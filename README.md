# Rutgers Esports Discord Bot
This is the Bitbucket/Github Repository for the Rutgers Esports Discord Bot, whose rewrite done!

### WHAT DO I DO?
Rutgers Esports Discord bot is a bot specially made for Rutgers Esports Discord. It has the ability to:

- Add, remove, list roles

- Lets mods and admins mute users

- Automutes users for mentioning certain roles

- Word filter

- Track edits and deletes for messages

- Keeps track of "chains" of the same messages

- Run code snippets in a sandboxed environment

- 2-step email verification for Rutgers Students

- Check understanding of rules by users through `!agree` before letting them into server.

### TODO LIST FOR V2
- [x] Implement custom command interaction with database
    - [x] add
    - [x] delete
    - [x] list
    - [x] detail
    - [x] filter
- [x] Support for legacy commands
- [x] Deny requests for custom commands
- [x] store rules in database and have command to easily update them.
- [x] Save warns in database
    - [x] add
    - [x] list
    - [x] filter
- [x] Let users "edit in" commands (call `client.emit('message')` for new edits).
- [x] delete bot message with emote
- [x] show text channels upon joining voice channel
- [x] delete all messages in voice channel upon all members leaving
- [x] settings
    - [x] prefix
    - [x] enable/disable chaining
    - [x] enable/disable message logging
    - [x] show current settings
- [x] Make it obvious what commands are custom (by reacting to custom command responses with a wrench or something).
- [x] eyeroll to unauthorized command usage
- [x] Write echo command
- [x] Clean up commands for custom commands (use add, remove, list framework)
- [x] Use commands by pinging bot
- [x] Exclude bots from getting live role.
- [x] Write command to query database
- [x] execute code blocks
- [x] repeat commands with just prefix
- [x] revamp help
- [x] make any command a setting
- [x] credits in whoami
- [x] Save quotes in database
- [x] make sound addition consistent with command addition
- [x] Handle votes in REEBO
- [x] implement blind voting
- [x] dont let users delete certain bot messages
- [x] vote for emotes

### HOW TO USE
1. Clone project into a folder somewhere (hopefully a server that will always be running)
2. `npm install hashtable discord.js mailgun requests` This is not a full list of dependencies yet.
3. Move `custom_modules/API_keys.js.dist` to `custom_modules/API_keys.js` and fill out API keys.
4. Navigate to the cloned folder and run `node main.js`

### SERVER MODIFICATIONS THAT MUST BE MADE IN A MANAGED SERVER FOR THIS TO RUN PROPERLY
1. Role given to bot must have admin permission.
2. There must be a channel named `#audit` \*
3. There must be a channel named `#approval` \*
4. There must be a channel named `#agreement` \*
    * MUTED:
        * READ MESSAGES: `false`
        * SEND MESSAGES: `false`
    * GAMER:
        * READ MESSAGES: `false`
        * SEND MESSAGES: `false`
    * @everyone:
        * READ MESSAGES: `true`
        * SEND MESSAGES: `true`
5. There must be a role named `GAMER` \*
    * Change Nickname
    * Read Text Channels & See Voice Channels
    * Send Messages
    * Embed Links
    * Attach Files
    * Read Message History
    * Use External Emojis
    * Add Reactions
    * Connect
    * Speak
    * Use Voice Activity
6. There must be a role named `MUTED` \*
    * Read Text Channels & See Voice Channels
    * Read Message History
    * Use External Emojis
    * Use Voice Activity
7. There must be a role named `LIVE` \*
    * Display role members separately from online members
8. "Identifier" roles such as game roles, `@everyone`, Rutgers Student, Rutgers Alumni, and Guest must have **no permissions**.
9. Roles to be excluded from the role list and that are supposed to be unable to be added like competitive roles should have the following permission: \*
    * Priority Speaker
11. Run `!givepermsall` upon swap between legacy Rutgers Esports Discord and new "neo" Rutgers Esports Discord.

\* Or edit the name of any of these things in the `Constants.js` file.

### SERVER MODIFICATIONS THAT MUST BE MADE IN AN UNMANAGED SERVER
None! Bot should work right out of the box.

### LINK
This link allows the user account that owns the bot to add it to another server:
[ will be updated soon ]

### KNOWN BUGS
1. Upon counting chains greater than or equal to 10, the bot sometimes reacts with the digits out of order.
