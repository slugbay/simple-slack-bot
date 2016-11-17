#Simple Slack Bot
[![license](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/slugbay/simple-slack-bot/blob/master/LICENSE.md)
[![SlugBay Badge](https://www.slugbay.com/pictures/badges/slugbay-simple.svg)](https://www.slugbay.com)

[![NPM](https://nodei.co/npm/simple-slack-bot.png?downloads=true)](https://nodei.co/npm/simple-slack-bot/) [![NPM](https://nodei.co/npm-dl/simple-slack-bot.png?months=5&height=2)](https://nodei.co/npm/simple-slack-bot/)

This is Node.js library for easy operation with <a href="https://api.slack.com/rtm">Slack's Real Time Messaging API</a>.

Installation (module)
-----

```
npm install simple-slack-bot
```

Events
-----

- `slack.login` - event fired, when Real Time Messaging API is started (via websocket).
- `slack.logout` - event fired, when bot logout from Slack.
- `ws.message` - event fired, when something happens in Slack. Description of all events <a href="https://api.slack.com/rtm">here</a>.
- `ws.open` - websocket connection is open and ready to communicate.
- `ws.close` - websocket connection is closed.
- `ws.error` - an error occurred while connecting to Slack.
- `ws.ping` - websocket connection is pinged.
- `ws.pong` - websocket connection is ponged.

Methods
-----

- `login()` - Start a connection to Real Time Messaging API,
- `logout()` - Logout from Slack and close websocket connection,
- `setCached(enabled)` - Enable/Disable caching (default: true) to keep channels/groups/users updated,
- `getChannels(callback)` - Returns a list of all channels in the team,
- `getGroups(callback)` - Returns a list of all groups in the team,
- `getUsers(callback)` - Returns a list of all users in the team,
- `getChannelByName(name, callback)` - Gets channel by name,
- `getGroupByName(name, callback)` - Gets group by name,
- `getUserByName(name, callback)` - Gets user by name,
- `getChannelId(name, callback)` - Gets channel ID by name,
- `getGroupId(name, callback)` - Gets group ID by name,
- `getUserId(name, callback)` - Gets user ID by name,
- `getChatId(name, callback)` - Returns or opens and returns a direct message channel id,
- `postMessage(id, text, params, [callback])` (return: promise) - posts a message to channel | group | user by id,
- `updateMessage(channelId, timestamp, text, params, [callback])` - updates a message in a channel,
- `postTo(name, message [, params, callback])` - posts a message to channel | group | user by name,
- `postMessageToUser(name, message [, params, callback])` - posts a direct message by user name,
- `postMessageToGroup(name, message [, params, callback])` - posts a message to private group by name,
- `postMessageToChannel(name, message [, params, callback])` - posts a message to channel by name.

Usage
-----

```js
var SlackBot = require('simple-slack-bot');

// create a bot
var bot = new SlackBot(
    // Slack configuration
    {
        cached: true, // Enable/Disable caching (default: true)
        token: 'xoxb-012345678-ABC1DFG2HIJ3', // Add a bot https://my.slack.com/services/new/bot and put the token 
        name: 'My Bot'
    },
    // Websocket connection parameters
    {
        protocols: {
            ...
        },
        options: {
            ...
        }
    }
});

bot.on('slack.login', function() {
    
    // more information about additional params https://api.slack.com/methods/chat.postMessage
    var params = {
        icon_emoji: ':cat:'
    };
    
    // define channel, where bot exist. You can adjust it there https://my.slack.com/services 
    bot.postMessageToChannel('general', 'meow!', params, function (result) {

    });
    
    // define existing username instead of 'user_name'
    bot.postMessageToUser('user_name', 'meow!', params, function (result) {

    }); 
    
    // If you add a 'slackbot' property, 
    // you will post to another user's slackbot channel instead of a direct message
    bot.postMessageToUser('user_name', 'meow!', { 'slackbot': true, icon_emoji: ':cat:' }, function (result) {

    }); 
    
    // define private group instead of 'private_group', where bot exist
    bot.postMessageToGroup('private_group', 'meow!', params, function (result) {

    });

    // all ingoing events https://api.slack.com/rtm
    bot.on('ws.message', function(event) {
        
        console.log('message', event.data);
        console.log('flags', event.flags);
    });
});

bot.login()
```

Credits
-----

  - Made with ♥ by [SlugBay](https://www.slugbay.com) engineers
    
  [![Screenshot](https://github.com/slugbay/slack-welcome-bot/raw/master/slugbay.jpg)](https://www.slugbay.com)
