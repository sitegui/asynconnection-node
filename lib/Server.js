'use strict'

var net = require('net'),
	tls = require('tls'),
	Connection = require('./Connection'),
	Peer = require('asynconnection-core').Peer,
	EventEmitter = require('events').EventEmitter

/**
 * @param {Context} context
 * @param {Object} socketOptions
 * @param {Object} auth
 * @class
 * @extends EventEmitter
 * @private
 */
function Server(context, socketOptions, auth) {
	EventEmitter.call(this)
	
	/**
	 * @member {net.Server|tls.Server}
	 * @readonly
	 */
	this.socket = null
	
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
		this.socket = tls.createServer(socketOptions, this._onconnection.bind(this))
	} else {
		this.socket = net.createServer(socketOptions, this._onconnection.bind(this))
	}
	
	// Forward some events
	/**
	 * @event Server#error
	 * @type {Error}
	 */
	this.socket.on('error', this.emit.bind(this, 'error'))
	/**
	 * Emitted when the underlying server socket emits 'close'
	 * @event Server#close
	 */
	this.socket.once('close', this.emit.bind(this, 'close'))
}

require('util').inherits(Server, EventEmitter)
module.exports = Server

/**
 * Start listening on a given port
 * @param {number} port
 * @param {string} [host]
 * @param {function()} [callback]
 * @returns {Server} - this
 */
Server.prototype.listen = function () {
	this.socket.listen.apply(this._socket, arguments)
	return this
}

/**
 * Stops the server from accepting new connections and keeps existing connections.
 * You can pass a callback to listen for the 'close' event.
 * @param {function()} [callback]
 */
Server.prototype.close = function (callback) {
	if (callback) {
		this.once('close', callback)
	}
	this.socket.close()
}

/**
 * @param {net.Socket|tls.CleartextStream} conn
 * @private
 */
Server.prototype._onconnection = function (conn) {
	var calls = this.context.getCalls(true),
		messages = this.context.getMessages(true),
		connection = new Connection(conn),
		peer = new Peer(calls, messages, this.auth, connection),
		onerror = this.emit.bind(this, 'error'),
		that = this
	
	// The server will forward errors until the peer is connected
	peer.on('error', onerror)
	peer.once('connect', function () {
		peer.removeListener('error', onerror)
		/**
		 * Emitted when a new connection is successfully established
		 * At this point, the peer has already been authenticated
		 * @event Server#connection
		 * @type {core:Peer}
		 */
		that.emit('connection', peer)
	})
}