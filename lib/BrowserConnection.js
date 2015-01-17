'use strict'

var EventEmitter = require('events').EventEmitter

/**
 * @class
 * @param {WebSocket} socket
 * @extends EventEmitter
 * @private
 */
function BrowserConnection(socket) {
	var that = this
	EventEmitter.call(this)

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.hasConnected = false

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.closed = false

	/**
	 * @member {WebSocket}
	 * @readonly
	 */
	this.socket = socket
	this.socket.binaryType = 'arraybuffer'

	// Set-up listeners
	this.socket.addEventListener('message', this._onmessage.bind(this))
	this.socket.addEventListener('close', this._onclose.bind(this))
	this.socket.addEventListener('error', this._onerror.bind(this))
	this.socket.addEventListener('open', function () {
		that.hasConnected = true
		/**
		 * @event Connection#connect
		 */
		that.emit('connect')
	})
}

require('util').inherits(BrowserConnection, EventEmitter)
module.exports = BrowserConnection

/**
 * Closes the connection
 */
BrowserConnection.prototype.close = function () {
	this.socket.close()
}

/**
 * @param {Buffer} frame
 * @private
 */
BrowserConnection.prototype.sendFrame = function (frame) {
	var len = frame.length
	if (this.closed) {
		return
	} else if (len >= 16777216) {
		// Hard limit of 16MiB
		throw new Error('Frame size exceeds maximum limit of 16MiB: ' + len)
	}

	this.socket.send(frame)
}

/**
 * @private
 */
BrowserConnection.prototype._onmessage = function (event) {
	var frame = new Buffer(new Uint8Array(event.data))

	/**
	 * @event Connection#frame
	 * @type {Buffer}
	 */
	this.emit('frame', frame)
}

/**
 * @private
 */
BrowserConnection.prototype._onclose = function () {
	if (!this.closed) {
		this.closed = true
		/**
		 * @event Connection#close
		 */
		this.emit('close')
		this.removeAllListeners('close').removeAllListeners('frame')
		this.socket = null
	}
}

/**
 * @param {Error} err
 * @private
 */
BrowserConnection.prototype._onerror = function (err) {
	/**
	 * @event Connection#error
	 * @type {Error}
	 */
	this.emit('error', err)
}