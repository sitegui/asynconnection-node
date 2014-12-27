'use strict'

var EventEmitter = require('events').EventEmitter

/**
 * @class
 * @param {ws:Connection} connection - a non-closed ws connection
 * @extends EventEmitter
 * @private
 */
function WSConnection(connection) {
	var that = this
	EventEmitter.call(this)

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.hasConnected = connection.readyState === connection.OPEN

	/**
	 * @member {boolean}
	 * @readonly
	 */
	this.closed = false

	/**
	 * @member {ws:Connection}
	 * @readonly
	 */
	this.connection = connection

	// Set-up listeners
	this.connection.on('binary', this._onbinary.bind(this))
	this.connection.once('close', this._onclose.bind(this))
	this.connection.on('error', this._onerror.bind(this))
	if (!this.hasConnected) {
		this.connection.once('connect', function () {
			that.hasConnected = true
			/**
			 * @event WSConnection#connect
			 */
			that.emit('connect')
		})
	}
}

require('util').inherits(WSConnection, EventEmitter)
module.exports = WSConnection

/**
 * Closes the connection
 */
WSConnection.prototype.close = function () {
	this.connection.close()
}

/**
 * @param {Buffer} frame
 * @private
 */
WSConnection.prototype.sendFrame = function (frame) {
	if (this.closed) {
		return
	}
	this.connection.sendBinary(frame)
}

/**
 * Read as much frames as possible
 * @private
 */
WSConnection.prototype._onbinary = function (inStream) {
	var pieces = [],
		size = 0,
		that = this
	
	inStream.on('data', function (data) {
		pieces.push(data)
		size += data.length
	})
	
	inStream.once('end', function () {
		if (that.closed) {
			// It may be the case the connection was closed before the whole frame was trasmitted
			return
		}
		
		/**
		 * @event WSConnection#frame
		 * @type {Buffer}
		 */
		that.emit('frame', Buffer.concat(pieces, size))
	})
}

/**
 * @private
 */
WSConnection.prototype._onclose = function () {
	if (!this.closed) {
		this.closed = true
		/**
		 * @event WSConnection#close
		 */
		this.emit('close')
		this.removeAllListeners('close').removeAllListeners('frame')
		this.connection.removeAllListeners('binary')
	}
}

/**
 * @param {Error} err
 * @private
 */
WSConnection.prototype._onerror = function (err) {
	/**
	 * @event WSConnection#error
	 * @type {Error}
	 */
	this.emit('error', err)
}