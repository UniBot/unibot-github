'use strict';

var shorturl = require('shorturl');

module.exports = {
    'IssuesEvent': function parser(event, next) {
        this._makeShortUrl(
            [event.payload.action + ' issue', event.repo.name],
            event.payload.issue.html_url,
            next
        );
    },
    'IssueCommentEvent': function parser(event, next) {
        this._makeShortUrl(
            ['Commented issue', event.repo.name],
            event.payload.comment.html_url,
            next
        );
    },
    'PushEvent': function parser(event, next) {
        this._makeShortUrl(
            ['Pushed ' + event.payload.size + ' commits to ' + event.repo.name],
            'https://github.com/' + event.repo.name + '/compare/' + event.payload.before + '...' + event.payload.head,
            next
        );
    },
    'WatchEvent': function parser(event, next) {
        this._makeShortUrl(
            ['Starred repository ' + event.repo.name],
            'https://github.com/' + event.repo.name,
            next
        );
    },
    '_makeShortUrl': function _makeShortUrl(message, url, next) {
        shorturl(url, function done(shortUrl) {
            message.push(shortUrl);

            next(null, message.join(' - '));
        });
    }
};
