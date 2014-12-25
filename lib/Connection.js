'use strict'

var EventEmitter = require('events').EventEmitter

/**
 * @class
 * @param {Socket} socket
 * @param {string} [connectEvent=''] - the event to listen to (or empty if the socket is connected)
 * @extends EventEmitter
 */
function Connection(socket, connectEvent) {
	var that = this
	EventEmitter.call(this)

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.hasConnected = Boolean(connectEvent)

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.closed = false

	/**
	 * @member {Socket}
	 * @readonly
	 */
	this.socket = socket

	/**
	 * How much data (in bytes) are we waiting for next frame
	 * @member {number}
	 * @private
	 */
	this._waitingData = 0

	// Set-up listeners
	this.socket.on('readable', this._onreadable.bind(this))
	this.socket.once('close', this._onclose.bind(this))
	this.socket.on('error', this._onerror.bind(this))
	if (connectEvent) {
		this.socket.once(connectEvent, function () {
			that.hasConnected = true
			/**
			 * @event Connection#connect
			 */
			that.emit('connect')
		})
	}
}

require('util').inherits(Connection, EventEmitter)
module.exports = Connection

/**
 * Closes the connection
 */
Connection.prototype.close = function () {
	this.socket.end()
}

/**
 * @param {Buffer} frame
 * @private
 */
Connection.prototype.sendFrame = function (frame) {
	var len = frame.length,
		a, b, c
	if (this.closed) {
		return
	} else if (len >= 16777216) {
		// Hard limit of 16MiB
		throw new Error('Frame size exceeds maximum limit of 16MiB: ' + len)
	}

	// Write header
	c = len & 0xFF
	b = (len >> 8) & 0xFF
	a = (len >> 16) & 0xFF
	this._socket.write(new Buffer([a, b, c]))

	this._socket.write(frame)
}

/**
 * Read as much frames as possible
 * @private
 */
Connection.prototype._onreadable = function () {
	var header, frame
	while (true) {
		if (!this._waitingData) {
			// Try to read the frame header
			header = this.socket.read(3)
			if (!header || header.length !== 3) {
				break
			}
			this._waitingData = (header[0] << 16) | (header[1] << 8) | header[2]
		}

		frame = this.socket.read(this._waitingData)
		if (!frame) {
			break
		} else if (frame.length !== this._waitingData) {
			this.emit('error', new Error('Failed to read frame, partial content (' + frame.length + ' of ' + this._waitingData + ')'))
			this._waitingData = 0
			break
		}

		this._waitingData = 0
		this.emit('frame', frame)
	}
}

/**
 * @private
 */
Connection.prototype._onclose = function () {
	if (!this.closed) {
		this.closed = true
		/**
		 * @event Connection#close
		 */
		this.emit('close')
		this.removeAllListeners('close').removeAllListeners('frame')
		this.socket.removeAllListeners('readable')
	}
}

/**
 * @param {Error} err
 * @private
 */
Connection.prototype._onerror = function (err) {
	/**
	 * @event Connection#error
	 * @type {Error}
	 */
	this.emit('error', err)
}