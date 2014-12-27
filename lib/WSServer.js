'use strict'

var WSConnection = require('./WSConnection'),
	EventEmitter = require('events').EventEmitter,
	ws = require('nodejs-websocket')

/**
 * @param {Context} context
 * @param {Object} socketOptions
 * @param {Object} auth
 * @class
 * @extends EventEmitter
 * @private
 */
function WSServer(context, socketOptions, auth) {
	EventEmitter.call(this)
	
	/**
	 * @member {ws:Server}
	 * @readonly
	 */
	this.wsServer = null
	
	/**
	 * @member {Context}
	 * @readonly
	 */
	this.context = context
	
	/**
	 * @member {Object}
	 * @readonly
	 */
	this.auth = auth
	
	// Create underlying socket
	if (socketOptions.pfx || socketOptions.key || socketOptions.cert) {
		socketOptions.secure = true
	}
	this.wsServer = ws.createServer(socketOptions, this._onconnection.bind(this))
	
	// Forward some events
	/**
	 * @event WSServer#error
	 * @type {Error}
	 */
	this.wsServer.on('error', this.emit.bind(this, 'error'))
	/**
	 * Emitted when the underlying server socket emits 'close'
	 * @event WSServer#close
	 */
	this.wsServer.once('close', this.emit.bind(this, 'close'))
}

require('util').inherits(WSServer, EventEmitter)
module.exports = WSServer

/**
 * Start listening on a given port
 * @param {number} port
 * @param {string} [host]
 * @param {function()} [callback]
 * @returns {WSServer} - this
 */
WSServer.prototype.listen = function () {
	this.wsServer.listen.apply(this.wsServer, arguments)
	return this
}

/**
 * Stops the server from accepting new connections and keeps existing connections.
 * You can pass a callback to listen for the 'close' event.
 * @param {function()} [callback]
 */
WSServer.prototype.close = function (callback) {
	if (callback) {
		this.once('close', callback)
	}
	this.wsServer.close()
}

/**
 * @param {ws:Connection} conn
 * @private
 */
WSServer.prototype._onconnection = function (conn) {
	var connection = new WSConnection(conn),
		peer = this.context._createPeer(true, this.auth, connection),
		onerror = this.emit.bind(this, 'error'),
		that = this
	
	// The server will forward errors until the peer is connected
	peer.on('error', onerror)
	peer.once('connect', function () {
		peer.removeListener('error', onerror)
		/**
		 * Emitted when a new connection is successfully established
		 * At this point, the peer has already been authenticated
		 * @event WSServer#connection
		 * @type {core:Peer}
		 */
		that.emit('connection', peer)
	})
}