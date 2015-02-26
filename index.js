/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var GitHubApi = require('github');
var shorturl = require('shorturl');
var moment = require('moment');
var async = require('async');
var _ = require('lodash');
var parseGithubEvent = require("parse-github-event");

/**
 * Generic GitHub plugin for UniBot
 *
 * @param  {Object} options Plugin options object, description below.
 *   db: {mongoose} the mongodb connection
 *   bot: {irc} the irc bot
 *   web: {connect} a connect + connect-rest webserver
 *   config: {object} UniBot configuration
 *
 * @return  {Function}  Init function to access shared resources
 */
module.exports = function init(options) {
    var config = options.config || {};

    /**
     * Plugin configuration.
     *
     * @type    {{
     *              moment: {
     *                  locale: string,
     *                  format: string
     *              },
     *              gist: {
     *                  message: string,
     *                  noDescription: string
     *              }
     *          }}
     */
    var pluginConfig = {
        "moment": {
            "locale": "",
            "format": "DD.MM.YYYY HH:mm:ss"
        },
        "gist": {
            "message": "${url} - ${date} - ${description}",
            "noDescription": "No description",
            "threshold": 3
        },
        "events": {
            "threshold": 3
        }
    };

    // Merge configuration for plugin
    if (_.isObject(config.plugins) && _.isObject(config.plugins.github)) {
        pluginConfig = _.merge(pluginConfig, config.plugins.github);
    }

    // Set moment locale, if it's set
    if (pluginConfig.moment.locale) {
        moment.locale(pluginConfig.moment.locale);
    }

    // Create GitHub API connection
    var github = new GitHubApi({
        version: '3.0.0'
    });

    /**
     * Helper method to make short version of given url. Note that function will try to make short url via multiple
     * different services in cases when short url creation fails for some reason. Mostly common reason is simple rate
     * limit exceed. If all services are failing function will fallback to original url.
     *
     * @param   {string}    url         URL to convert short version
     * @param   {function}  next        Callback function
     * @param   {string}    [message]   Possible message which is prepended to short url
     * @param   {array}     [services]  Array of short url services
     *
     * @private
     */
    function _makeShortUrl(url, next, message, services) {
        // Specify default order of short url services, this is initialized on first call
        services = services || ['v.gd', 'arseh.at', 'goo.gl', 'is.gd'];

        // Get next service from queue
        var service = services.pop();

        // Create
        shorturl(url, service, function done(shortUrl) {
            // Darn short url generation failed, so just try to generate it again with left services
            if (_.isUndefined(shortUrl) && services.length > 0) {
                _makeShortUrl(url, next, message, services);
            } else {
                message = message ? message + ' - ' : '';

                next(null, message + shortUrl || url);
            }
        });
    }

    /**
     * Generic error handler function, which will just send error message to nick that triggered command where actual
     * error happened.
     *
     * @param   {*} channel
     * @param   {*} from
     * @param   {*} error
     * @private
     */
    function _handleError(channel, from, error) {
        channel.say('Oh noes, error - ' + JSON.stringify(error), from);
    }

    /**
     * Helper function to say message to channel or user itself, if given threshold is exceeded.
     *
     * @param   {*}         channel
     * @param   {string[]}  data
     * @param   {string}    from
     * @param   {number}    threshold
     * @private
     */
    function _sayMessage(channel, data, from, threshold) {
        if (data.length > threshold) {
            _.forEach(data, function iterator(message) {
                channel.say(message, from);
            });
        } else {
            channel.say(data.join(', '));
        }
    }

    // Actual GitHub plugin implementation
    return function plugin(channel) {
        return {
            "^!ghGist(?: (\\S+))?(?: (\\d+))?$": function onMatch(from, matches) {
                var username = from;
                var itemCount = 1;

                if (matches[2]) {
                    username = matches[1];
                    itemCount = matches[2];
                } else if (matches[1]) {
                    username = matches[1];
                }

                /**
                 * Private parser function for gist handling, this will make the actual message.
                 *
                 * @param   {*}     channel
                 * @param   {{}[]}  gists
                 * @private
                 */
                function _gistParser(channel, gists) {
                    async.map(
                        gists,
                        function iterator(gist, callback) {
                            _makeShortUrl(gist.html_url, function done(error, shortUrl) {
                                var templateVars = {
                                    date: moment(gist.created_at < gist.updated_at
                                        ? gist.updated_at
                                        : gist.created_at).format(pluginConfig.moment.format),
                                    description: gist.description || pluginConfig.gist.noDescription,
                                    files: gist.files.length,
                                    url: shortUrl
                                };

                                callback(null, _.template(pluginConfig.gist.message, templateVars));
                            });
                        },
                        function callback(error, gists) {
                            if (!_.isEmpty(gists)) {
                                _sayMessage(channel, gists, from, pluginConfig.gist.threshold);
                            }
                        }
                    );
                }

                // Fetch specified user gist data
                github.gists.getFromUser({
                    user: username,
                    per_page: itemCount
                }, function onResult(error, gists) {
                    error ? _handleError(channel, from, error) : _gistParser(channel, gists);
                });
            },
            "^!ghOrgMembers(?: (\\S+))$": function onMatch(from, matches) {
                /**
                 * Private parser function for organization members.
                 *
                 * @param   {*}     channel
                 * @param   {{}[]}  members
                 * @private
                 */
                function _orgMembersParser(channel, members) {
                    async.map(
                        members,
                        function iterator(member, callback) {
                            _makeShortUrl(member.html_url, callback, member.login);
                        },
                        function callback(error, members) {
                            if (!_.isEmpty(members)) {
                                channel.say(members.join(', '));
                            }
                        }
                    );
                }

                // Fetch specified organization members
                github.orgs.getMembers({
                    org: matches[1],
                    per_page: 300
                }, function onResult(error, members) {
                    error ? _handleError(channel, from, error) : _orgMembersParser(channel, members);
                });
            },
            "^!ghRepos(?: (\\S+))?(?: (\\d+))?$": function onMatch(from, matches) {
                var username = from;
                var itemCount = 2;

                if (matches[2]) {
                    username = matches[1];
                    itemCount = matches[2];
                } else if (matches[1]) {
                    username = matches[1];
                }

                /**
                 * Private parser function for user / organization repositories.
                 *
                 * @param   {*}     channel
                 * @param   {{}[]}  repositories
                 * @private
                 */
                function _repoParser(channel, repositories) {
                    _.forEach(repositories, function iterator(repo) {
                        repo._forks = -repo.forks_count;
                        repo._watchers = -repo.watchers_count;
                    });

                    async.map(
                        _.sortBy(repositories, ['_forks', '_watchers', 'name']).splice(0, itemCount),
                        function iterator(repo, callback) {
                            _makeShortUrl(repo.html_url, callback, repo.name);
                        },
                        function callback(error, repos) {
                            if (!_.isEmpty(repos)) {
                                channel.say(repos.join(', '));
                            }
                        }
                    );
                }

                // Fetch GitHub repository data
                github.repos.getFromUser({
                    user: username,
                    type: 'owner'
                }, function onResult(error, repos) {
                    error ? _handleError(channel, from, error) : _repoParser(channel, repos);
                });
            },
            "!ghEvents(?: (\\S+))?(?: (\\d+))?": function onMatch(from, matches) {
                var username = matches[1] ? matches[1] : from;
                var itemCount = matches[2] ? matches[2] : 1;

                /**
                 * Private parser function for user events.
                 *
                 * @param   {*}     channel
                 * @param   {{}[]}  events
                 * @private
                 */
                function _eventParser(channel, events) {
                    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

                    async.map(
                        events,
                        function iterator(event, callback) {
                            var parsed = parseGithubEvent.parse(event);

                            _makeShortUrl(parsed.html_url, callback, _.template(parsed.text, parsed.data));
                        },
                        function callback(error, events) {
                            _sayMessage(channel, events, from, pluginConfig.events.threshold);
                        }
                    );
                }

                // Fetch events
                github.events.getFromUser({
                    user: username,
                    per_page: itemCount
                }, function onResult(error, events) {
                    error ? _handleError(channel, from, error) : _eventParser(channel, events);
                });
            }
        };
    };
};
