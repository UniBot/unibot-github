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

/**
 * URL log plugin for UniBot
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
            "noDescription": "No description"
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

                // Fetch specified user gist data
                github.gists.getFromUser({
                    user: username,
                    per_page: itemCount
                }, function onResult(error, result) {
                    if (error) {
                        channel.say('Oh noes, error - ' + JSON.stringify(error), from);
                    } else {
                        _.forEach(result, function iterator(gist) {
                            var templateVars = {
                                date: moment(gist.created_at < gist.updated_at ? gist.updated_at : gist.created_at).format(pluginConfig.moment.format),
                                description: gist.description || pluginConfig.gist.noDescription,
                                files: gist.files.length
                            };

                            shorturl(gist.html_url, function done(shortUrl) {
                                templateVars.url = shortUrl;

                                channel.say(_.template(pluginConfig.gist.message, templateVars));
                            });
                        });
                    }
                });
            },
            "^!ghOrgMembers(?: (\\S+))$": function onMatch(from, matches) {
                github.orgs.getMembers({
                    org: matches[1],
                    per_page: 300
                }, function onResult(error, result) {
                    if (error) {
                        channel.say('Oh noes, error - ' + JSON.stringify(error), from);
                    } else {
                        async.map(
                            result,
                            function iterator(member, callback) {
                                shorturl(member.html_url, function done(shortUrl) {
                                    callback(null, member.login + ' - ' + shortUrl);
                                });
                            },
                            function callback(error, members) {
                                if (!_.isEmpty(members)) {
                                    channel.say(members.join(', '));
                                }
                            }
                        );
                    }
                });
            }
        };
    };
};
