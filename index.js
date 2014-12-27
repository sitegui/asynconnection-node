'use strict'

module.exports = require('./lib/Context')

// Set maxBufferLength for WebSocket connections as 17MiB
// This give enough space for the maximum frame size (16MiB)
require('nodejs-websocket').setMaxBufferLength(17 * 1024 * 1024)