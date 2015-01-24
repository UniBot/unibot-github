/**
 * Simple test file for unibot-github plugin.
 *
 * Purpose of this is just to "mimic" actual IRC messages on channel where plugin is enabled.
 *
 * Usage:
 *  node test.js [message]
 *
 * @todo    make real help for this.
 */

/**
 * Runner dependencies.
 *
 * @type {exports}
 */
var _ = require('lodash');
var plugin = require('./index');

/**
 * Nick who is making query
 *
 * @type {string}
 */
var from = 'tarlepp';
var message = process.argv.slice(2).join(' ');

if (_.isEmpty(message)) {
    console.log('Please give some command to process...');

    return;
}

message = '!' + message;

var match = false;

_.each(plugin({})({say: function(message) { console.log(message); } }), function iterator(callback, pattern) {
    var expression = new RegExp(pattern, 'i');
    var matches = expression.exec(message);

    if (matches) {
        console.log('Plugin matches with: ' + message);

        match = true;

        callback(from, matches);
    }
});

if (!match) {
    console.log('Plugin does not match with: ' + message);
}
