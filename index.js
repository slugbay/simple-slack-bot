/****************
 * IMPORTS
 */

var _ = require('underscore')
var async = require('async')
var request = require('request')
var util = require('util')
var WebSocket = require('ws')
var EventEmitter = require('events').EventEmitter

/****************
 * PRIVATE
 */

/****************
 * PUBLIC
 */

function SlackBot ( slack_params, ws_params ) {
    this.cached = typeof slack_params.cached !== 'undefined' ? slack_params.cached : true
    this.token = slack_params.token || null
    this.name = slack_params.name || null
    this.reconnect_url = null
    ws_params = ws_params || {}
    this.ws_protocols = ws_params.protocols || null
    this.ws_options = ws_params.options || null
}

util.inherits(SlackBot, EventEmitter)

/****************
 * setCached
 */

SlackBot.prototype.setCached = function ( cached ) {
    this.cached = cached
}

/****************
 * _callCallBack
 */

SlackBot.prototype._callCallBack = function ( callback, value ) {
    if (callback) {
        callback( value )
    }
}

/****************
 * _preprocessParams
 */

SlackBot.prototype._preprocessParams = function ( params ) {
    if (!params) {
        return {
            token: this.token
        }
    } 
    params.token = this.token

    Object.keys(params).forEach(function(name) {
        var param = params[name]
        if (param &&
            typeof param === 'object') {
            params[name] = JSON.stringify(param)
        }
    })

    return params
}

/****************
 * _preprocessParams
 */

SlackBot.prototype._api = function ( methodName, params, callback ) {

    var payload = {
        url: 'https://slack.com/api/' + methodName,
        form: this._preprocessParams(params)
    }

    //console.log('form', payload.form)

    request.post(payload, function ( err, response, body ) {
        if (err) {
            console.log(err)
            this._callCallBack( callback, null )
            return
        }
        try {
            var result = JSON.parse(body)
            if (result.warning) {
                console.log('WARNING: ' + result.warning)
            }
            if (result.ok) {
                this._callCallBack( callback, result )
            }
            else {
                console.log('ERROR: ' + result.error)
                this._callCallBack( callback, null )
            }
        }
        catch (e) {
            console.log(e)
            this._callCallBack( callback, null )
            return
        }

    }.bind(this)) 
}

/**
 * Starts a Real Time Messaging API session
 */
SlackBot.prototype.login = function () {
    
    this._api('rtm.start', null, function (data) {

        if (!data) {
            return
        }

        this.data = data
        this.emit('slack.login')
        this.connect()

    }.bind(this))
}

SlackBot.prototype.logout = function () {

    this.ws.terminate()
    this.emit('slack.logout')
}

SlackBot.prototype.setWebsocketEvents = function () {

    this.ws.on('error', function (error) {
        this.emit('ws.error', error)
    }.bind(this))

    this.ws.on('close', function (code, message) {
        this.emit('ws.close', {
            code: code,
            message: message
        })
    }.bind(this))

    this.ws.on('open', function () {
        this.emit('ws.open')
    }.bind(this))

    this.ws.on('ping', function (data, flags) {
        this.emit('ws.ping', {
            data: data,
            flags: flags
        })
    }.bind(this))

    this.ws.on('pong', function (data, flags) {
        this.emit('ws.pong', {
            data: data,
            flags: flags
        })
    }.bind(this))

    this.ws.on('message', function (data, flags) {
        try {
            var message = JSON.parse(data)
            this.emit('ws.message', {
                data: message,
                flags: flags
            })
            // Experimental - https://api.slack.com/events/reconnect_url
            // Save in background the last slack websocket url
            if (message.type == 'reconnect_url') {
                this.reconnect_url = message.url
            }
        }
        catch (e) {
            console.log(e)
            this.emit('ws.message', {
                data: data,
                flags: flags
            })
        }
    }.bind(this))
}

SlackBot.prototype.connect = function () {
    
    this.ws = new WebSocket(
        this.data.url,
        this.ws_protocols,
        this.ws_options
    )

    this.setWebsocketEvents()
}

SlackBot.prototype.reconnect = function ( url ) {

    if (!this.ws) {
        console.log('ERROR: websocket not connected')
        return
    }

    this.ws.terminate()
    
    this.ws = new WebSocket(
        url || this.data.url,
        this.ws_protocols,
        this.ws_options
    )

    this.setWebsocketEvents()
}

SlackBot.prototype.getChannels = function ( callback ) {
    var channels = this.data.channels || null
    if (this.cached &&
        channels) {
        this._callCallBack( callback, channels )
        return
    }
    this._api('channels.list', null, function (data) {
        this.data.channels = data.channels
        this._callCallBack( callback, this.data.channels )
    }.bind(this))
}

SlackBot.prototype.getUsers = function ( callback ) {
    var users = this.data.users || null
    if (this.cached &&
        users) {
        this._callCallBack( callback, users )
        return
    }
    this._api('users.list', null, function (data) {
        this.data.users = data.members
        this._callCallBack( callback, this.data.users )
    }.bind(this))
}

SlackBot.prototype.getGroups = function ( callback ) {
    var groups = this.data.groups || null
    if (this.cached &&
        groups) {
        this._callCallBack( callback, groups )
        return
    }
    this._api('groups.list', null, function (data) {
        this.data.groups = data.groups
        this._callCallBack( callback, this.data.groups )
    }.bind(this))
}

SlackBot.prototype.getUserByName = function ( name, callback ) {
    this.getUsers(function ( users ) {

        var result = _.find( users, function (user) {
            return user.name == name
        })
        if (!result) {
            console.log('WARNING: user (name:' + name + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getChannelByName = function ( name, callback ) {
    this.getChannels(function ( channels ) {

        var result = _.find( channels, function (channel) {
            return channel.name == name
        })
        if (!result) {
            console.log('WARNING: channel (name:' + name + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getGroupByName = function ( name, callback ) {
    this.getGroups(function ( groups ) {

        var result = _.find( groups, function (group) {
            return group.name == name
        })
        if (!result) {
            console.log('WARNING: group (name:' + name + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getUserById = function ( id, callback ) {
    this.getUsers(function ( users ) {

        var result = _.find( users, function (user) {
            return user.id == id
        })
        if (!result) {
            console.log('WARNING: user (id:' + id + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getChannelById = function ( id, callback ) {
    this.getChannels(function ( channels ) {

        var result = _.find( channels, function (id) {
            return channel.id == id
        }) 
        if (!result) {
            console.log('WARNING: channel (id:' + id + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getGroupById = function ( id, callback ) {
    this.getGroups(function ( groups ) {

        var result = _.find( groups, function (group) {
            return group.id == id
        })
        if (!result) {
            console.log('WARNING: group (id:' + id + ') not found')
        }
        this._callCallBack( callback, result )

    }.bind(this))
}

SlackBot.prototype.getChannelId = function ( name, callback ) {
    this.getChannelByName(name, function ( channel ) {
        this._callCallBack( callback, channel ? channel.id : null )
    }.bind(this))
}

SlackBot.prototype.getGroupId = function ( name, callback ) {
    this.getGroupByName(name, function ( group ) {
        this._callCallBack( callback, group ? group.id : null )
    }.bind(this))
}

SlackBot.prototype.getUserId = function ( name, callback ) {
    this.getUserByName(name, function ( user ) {
        this._callCallBack( callback, user ? user.id : null )
    }.bind(this))
}

SlackBot.prototype.openIm = function ( userId, callback ) {
    this._api('im.open', { user: userId }, function (data) {
        if (!data) {
            this._callCallBack( callback, null )
            return
        }
        this._callCallBack( callback, data.channel.id )
    }.bind(this))
}

SlackBot.prototype.getChatId = function ( name, callback ) {
    this.getUserByName( name, function ( user ) {

        if (!user) {
            this._callCallBack( callback, null )
            return
        }
        var im = _.find( this.data.ims, function (im) {
            return im.user == user.id
        })
        if (!im) {
            this.openIm( user.id, callback )
            return
        }
        this._callCallBack( callback, im.id )

    }.bind(this))
}

SlackBot.prototype.postMessage = function ( id, text, params, callback ) {
    params = params || {}
    params.text = text
    params.channel = id
    if (this.name) {
        params.username = this.name
    }
    this._api('chat.postMessage', params, callback)
}

SlackBot.prototype.updateMessage = function ( id, ts, text, params, callback ) {
    params = params || {}
    params.ts = ts
    params.text = text
    params.channel = id
    if (this.name) {
        params.username = this.name
    }
    this._api('chat.update', params, callback)
}

SlackBot.prototype.postMessageToUser = function ( name, text, params, callback ) {
    this._post((params || {}).slackbot ? 'slackbot' : 'user', name, text, params, callback)
}

SlackBot.prototype.postMessageToChannel = function ( name, text, params, callback ) {
    this._post('channel', name, text, params, callback)
}

SlackBot.prototype.postMessageToGroup = function ( name, text, params, callback ) {
    this._post('group', name, text, params, callback)
}

SlackBot.prototype._post = function ( type, name, text, params, callback ) {
    var method = ({
        'group': 'getGroupId',
        'channel': 'getChannelId',
        'user': 'getChatId',
        'slackbot': 'getUserId'
    })[type]

    if (typeof params === 'function') {
        callback = params
        params = null
    }

    this[method](name, function (id) {

        if (!id) {
            callback(null)
            return
        }
        this.postMessage( id, text, params, callback )

    }.bind(this))
}

SlackBot.prototype.postTo = function ( name, text, params, callback ) {
    
    var type = null
    async.series(
        [
            function (cb) {

                this.getChannels(function (channels) {

                    var r = _.find(channels, function (channel) {
                        return channel.name == name
                    })
                    if (r) {
                        type = 'channel'
                    }
                    cb(null)
                })

            }.bind(this),
            function (cb) {

                if (!type) {

                    this.getUsers(function (users) {

                        var r = _.find(users, function (user) {
                            return user.name == name
                        })
                        if (r) {
                            type = 'user'
                        }
                        cb(null)
                    })
                }
                else {
                    cb(null)
                } 

            }.bind(this),
            function (cb) {

                if (!type) {

                    this.getGroups(function (groups) {

                        var r = _.find(groups, function (group) {
                            return group.name == name
                        })
                        if (r) {
                            type = 'group'
                        }
                        cb(null)
                    })
                }
                else {
                    cb(null)
                }

            }.bind(this)
        ],
        function (err, results) {
            
            switch (type) {
                case 'channel':
                    this.postMessageToChannel( name, text, params, callback )
                    break
                case 'group':
                    this.postMessageToGroup( name, text, params, callback )
                    break
                default:
                    this.postMessageToUser( name, text, params, callback )
                    break
            }
        }
    )
}

module.exports = SlackBot
