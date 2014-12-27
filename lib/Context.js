'use strict'

var net = require('net'),
	tls = require('tls'),
	CoreContext = require('asynconnection-core').Context,
	Server = require('./Server'),
	WSServer = require('./WSServer'),
	Connection = require('./Connection'),
	WSConnection = require('./WSConnection'),
	ws = require('nodejs-websocket')

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
 * @typedef {Object} AuthOptions
 * @property {string} [user='']
 * @property {string} [password='']
 * @property {boolean} [required=false] - if true, will require client authentication
 * @property {core:Peer~AuthHandler} [handler] - the default handler accepts any user/password
 */

/**
 * Create a new server from this context.
 * To create a server using TLS, at least one of 'pfx', 'key', 'cert' must be set in socketOptions
 * @param {Object} [socketOptions] - an object passed to net.createServer or tls.createServer
 * @param {AuthOptions} [auth] - an object describing how the server will handle autentication
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
	}

	var server = new Server(this, socketOptions || {}, auth || {})
	if (callback) {
		server.on('connection', callback)
	}
	return server
}

/**
 * Create a new client from this context.
 * To connect to a server using TLS, set 'secure' as true in socketOptions
 * @param {Object} socketOptions - an object passed to net.connect or tls.connect (if secure is true)
 * @param {AuthOptions} [auth] - an object describing how the client should autenticate
 * @param {function()} [callback] - added as a listener to event:Client#connect
 * @returns {core:Peer}
 */
Context.prototype.connect = function (socketOptions, auth, callback) {
	var connection, peer
	if (typeof socketOptions === 'function') {
		callback = socketOptions
		auth = {}
		socketOptions = {}
	} else if (typeof auth === 'function') {
		callback = auth
		auth = {}
	}

	// Create underlying socket
	if (socketOptions.secure) {
		connection = new Connection(tls.connect(socketOptions), 'secureConnect')
	} else {
		connection = new Connection(net.connect(socketOptions), 'connect')
	}

	peer = this._createPeer(false, auth || {}, connection)
	if (callback) {
		peer.on('connect', callback)
	}
	return peer
}

/**
 * Create a new websocket server from this context.
 * To create a server using TLS, at least one of 'pfx', 'key', 'cert' must be set in socketOptions
 * @param {Object} [socketOptions] - an object passed to net.createServer or tls.createServer
 * @param {AuthOptions} [auth] - an object describing how the server will handle autentication
 * @param {function(core:Peer)} [callback] - added as a listener to event:WSServer#connection
 * @returns {ws:Server}
 */
Context.prototype.createWSServer = function (socketOptions, auth, callback) {
	if (typeof socketOptions === 'function') {
		callback = socketOptions
		auth = {}
		socketOptions = {}
	} else if (typeof auth === 'function') {
		callback = auth
		auth = {}
	}

	var server = new WSServer(this, socketOptions || {}, auth || {})
	if (callback) {
		server.on('connection', callback)
	}
	return server
}

/**
 * Create a new websocket client from this context.
 * To connect to a server using TLS, set 'secure' as true in socketOptions
 * @param {Object} socketOptions - an object passed to net.connect or tls.connect (if secure is true)
 * @param {AuthOptions} [auth] - an object describing how the client should autenticate
 * @param {function()} [callback] - added as a listener to event:WSClient#connect
 * @returns {core:Peer}
 */
Context.prototype.connectWS = function (socketOptions, auth, callback) {
	var connection, peer, protocol, host, port
	if (typeof socketOptions === 'function') {
		callback = socketOptions
		auth = {}
		socketOptions = {}
	} else if (typeof auth === 'function') {
		callback = auth
		auth = {}
	}

	// Create underlying socket
	protocol = socketOptions.secure ? 'wss' : 'ws'
	host = socketOptions.host || 'localhost'
	port = socketOptions.port
	connection = new WSConnection(ws.connect(protocol + '://' + host + ':' + port))

	peer = this._createPeer(false, auth || {}, connection)
	if (callback) {
		peer.on('connect', callback)
	}
	return peer
}