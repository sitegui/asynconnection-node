'use strict'

var net = require('net'),
	tls = require('tls'),
	CoreContext = require('asynconnection-core').Context,
	Peer = require('asynconnection-core').Peer,
	Server = require('./Server'),
	Connection = require('./Connection')

/**
 * A set of messages and calls
 * Servers and clients are created from a Context
 * @class
 * @extends core:Context
 */
function Context() {
	CoreContext.call(this)
}

require('util').inherits(Context, CoreContext)
module.exports = Context

/**
 * Create a new server from this context.
 * To create a server using TLS, at least one of 'pfx', 'key', 'cert' must be set in socketOptions
 * @param {Object} [socketOptions] - an object passed to net.createServer or tls.createServer
 * @param {Object} [auth] - an object describing how the server will handle autentication
 * @param {string} [auth.user='']
 * @param {string} [auth.password='']
 * @param {boolean} [auth.required=false] - if true, will require client authentication
 * @param {core:Peer~AuthHandler} [auth.handler] - the default handler accepts any user/password
 * @param {function(core:Peer)} [callback] - added as a listener to event:Server#connection
 * @returns {Server}
 */
Context.prototype.createServer = function (socketOptions, auth, callback) {
	if (typeof socketOptions === 'function') {
		callback = socketOptions
		auth = {}
		socketOptions = {}
	} else if (typeof auth === 'function') {
		callback = auth
		auth = {}
		socketOptions = socketOptions || {}
	} else {
		auth = auth || {}
		socketOptions = socketOptions || {}
	}
	
	var server = new Server(this, socketOptions, auth)
	if (callback) {
		server.on('connection', callback)
	}
	return server
}

/**
 * Create a new client from this context.
 * To connect to a server using TLS, set 'secure' as true in socketOptions
 * @param {Object} [socketOptions] - an object passed to net.connect or tls.connect (if secure is true)
 * @param {Object} [auth] - an object describing how the client should autenticate
 * @param {string} [auth.user='']
 * @param {string} [auth.password='']
 * @param {boolean} [auth.required=false] - if true, will require server authentication
 * @param {core:Peer~AuthHandler} [auth.handler] - the default handler accepts any user/password
 * @param {function()} [callback] - added as a listener to event:Client#connect
 * @returns {Client}
 */
Context.prototype.connect = function (socketOptions, auth, callback) {
	var calls = this.getCalls(false),
		messages = this.getMessages(false),
		connection, peer
	if (typeof socketOptions === 'function') {
		callback = socketOptions
		auth = {}
		socketOptions = {}
	} else if (typeof auth === 'function') {
		callback = auth
		auth = {}
		socketOptions = socketOptions || {}
	} else {
		auth = auth || {}
		socketOptions = socketOptions || {}
	}
	
	// Create underlying socket
	if (socketOptions.secure) {
		connection = new Connection(tls.connect(socketOptions), 'secureConnect')
	} else {
		connection = new Connection(net.connect(socketOptions), 'connect')
	}
	
	peer = new Peer(calls, messages, auth, connection)
	if (callback) {
		peer.on('connect', callback)
	}
	return peer
}