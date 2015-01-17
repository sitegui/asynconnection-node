/*globals WebSocket*/
'use strict'

var CoreContext = require('asynconnection-core').Context,
	BrowserConnection = require('./lib/BrowserConnection')

/**
 * A set of messages and calls
 * Clients are created from a Context
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
 * Create a new client from this context.
 * @param {string} url - the web socket url
 * @param {AuthOptions} [auth] - an object describing how the client should autenticate
 * @param {function()} [callback] - added as a listener to event:Peer#connect
 * @returns {core:Peer}
 */
Context.prototype.connect = function (url, auth, callback) {
	var connection = new BrowserConnection(new WebSocket(url)),
		peer = this._createPeer(false, auth || {}, connection)
	if (callback) {
		peer.on('connect', callback)
	}
	return peer
}