'use strict';

var shorturl = require('shorturl');
var _ = require('lodash');

module.exports = {
    'CreateEvent': function parser(event, next) {
        this._makeShortUrl(
            ['Created new repository', event.repo.name, event.payload.description],
            'https://github.com/' + event.repo.name,
            next
        );
    },
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
    'PullRequestEvent': function parser(event, next) {
        this._makeShortUrl(
            [event.payload.action + ' pull request', event.repo.name],
            event.payload.pull_request.html_url,
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
    '_makeShortUrl': function _makeShortUrl(message, url, next, services) {
        var self = this;

        services = services || ['arseh.at', 'goo.gl', 'is.gd', 'v.gd'];

        var service = services.pop();

        shorturl(url, service, function done(shortUrl) {
            if (_.isUndefined(shortUrl) && services.length > 0) {
                self._makeShortUrl(message, url, next, services);
            } else {
                message.push(shortUrl || url);

                next(null, message.join(' - '));
            }
        });
    }
};
