# unibot-github
Generic GitHub plugin for UniBot. This plugin uses [GitHub API v3](https://developer.github.com/v3/) to show common
data from GitHub user / organization.

## Install
To your UniBot application

```npm install git://github.com/UniBot/unibot-github --save```

And after that register new plugin on IRC channels what you need

```plugin [#channel] github```

## Usage
Currently plugin supports following commands.

#### !ghGist [user] [count]
This command fetched specified user latest gist data. If ```user``` isn't given command will use triggered IRC nick as 
an user. ```count``` is defaulted to 1.

#### !ghRepos [user/organization] [count]
Command to fetch popular repositories from specified user / organization. If ```user``` isn't given command will use 
triggered IRC nick as an user. ```count``` is defaulted to 2.

#### !ghOrgMembers [organization]
Command fetches specified organization members and list those with user GitHub url.

## Configuration
TODO

## Libraries that plugin uses
* [node-github](https://github.com/mikedeboer/node-github) - JavaScript GitHub API for Node.JS
* [lodash](https://lodash.com/) - A JavaScript utility library delivering consistency
* [Moment.js](http://momentjs.com/) - Parse, validate, manipulate, and display dates in JavaScript
* [node-shorturl](https://github.com/jdub/node-shorturl) - Simple URL shortener client library for node.js
* [Async.js](https://github.com/caolan/async) - Async is a utility module which provides straight-forward, powerful functions for working with asynchronous JavaScript
