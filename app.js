/*jslint node: true */
/*eslint-env node */
"use strict";

var express = require('express'),
    mongoose = require('mongoose'),
    discovery = require('./controllers/discovery'),
    device = require('./handlers/device'),
    BasicStrategy = require("passport-http").BasicStrategy,
    application = require('./handlers/application'),
    ApplicationModel = require("./models/application"),
    push = require('./handlers/push'),
    bodyParser = require("body-parser"),
    util = require("util"),
    logger = require("./logger"),
    morgan = require("morgan"),
    multer  = require('multer'),
    generalConfig = require("config").general,
    errorHandler = require("errorhandler"),
    passport = require("passport");

var app = module.exports = express(),
    mongoUri = process.env.MONGOLAB_URI || process.argv[2] || "mongodb://localhost/openurban";

mongoose.connect(mongoUri);

logger.info("mongodb: " + mongoUri);

app.map = function (a, route) {
    route = route || "";
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            if (Array.isArray(a[key])) {
                logger.verbose(util.format("%s %s", key, route));
                app[key](route, a[key]);

                continue;
            }

            switch (typeof a[key]) {
                // { "/path": { ... }}
                case "object":
                    app.map(a[key], route + key);
                    break;

                // get: function(){ ... }
                case "function":
                    logger.verbose(util.format("%s %s", key, route));
                    app[key](route, a[key]);

                    break;
            }
        }
    }
};

if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str) {
        return this.indexOf(str) === 0;
    };
}

passport.use(new BasicStrategy(
    function(auth_access_key, auth_secret, done) {
        logger.verbose(util.format("basic auth for: %s", auth_access_key));

        if (!auth_access_key) {
            logger.info(util.format("missing auth_access_key"));
            return done(null, false);
        }

        if (!auth_secret) {
            logger.info(util.format("missing password for %s", auth_secret));
            return done(null, false);
        }

        if (auth_secret === generalConfig.masterSecret && auth_access_key === generalConfig.masterKey) {
            return done(null, {});
        }

        // Find the user by username.  If there is no user with the given
        // username, or the password is not correct, set the user to `false` to
        // indicate failure.  Otherwise, return the authenticated `user`.
        ApplicationModel.findOne(
            {
                access_key: auth_access_key
            },
            function (err, app) {
                if (err) {
                    logger.error('failed to look for application %s', err);
                }

                if (err || !app) {
                    return done(null, false);
                }

                logger.debug('application found: %s (%s)', app, err);
                logger.debug('%s, %s', app.secret_key_push, auth_secret);

                if (app.secret_key_push !== auth_secret && app.secret_key != auth_secret) {
                    return done(null, false);
                }

                var userApp = {
                        app: app,
                        masterAuth: app.secret_key_push === auth_secret,
                        simpleAuth: app.secret_key === auth_secret
                    };

                return done(null, userApp);
            }
        );
    }
));

function authenticate() {
    return passport.authenticate(["basic"], { session: false });
}

app.use(passport.initialize());
app.use(bodyParser.json());
app.use(multer({ dest: './uploads/'}))

if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
}

app.map({
    '/api': {
        '/application/?': {
            put: application.create,
            get: [authenticate(), application.list]
        },
        '/application/services': {
            '/ios': {
                put: [authenticate(), application.configureIOS]
            }
        },
        '/device_tokens/:token': {
            put: [authenticate(), device.put]
        },
        '/device_tokens/': {
            get: [authenticate(), device.list]
        },
        '/push/': {
            post: [authenticate(), push.push]
        },
        '/discovery': {
			get: discovery.get,
			'/v1/apis': {
				get: discovery.apis,
				'/application/v1/rest': {
					get: application.apis
				},
				'/device_token/v1/rest': {
					get: device.apis
				},
				'/push/v1/rest': {
					get: push.apis
				}				
			}
		},
		'/static/proxy.html': {
			get: discovery.proxy
        }
    }
});

// development only
if (app.get("env") === "development") {
    app.use(errorHandler());
} else {
    app.use(function (err, req, res, next) {
        if (err instanceof ApplicationError) {
            logger.info(util.format("Application Error %s", err));
            res.writeHead(err.statusCode, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: {message: err.message}}));
        } else {
            next(err);
        }
    });
}

var port = process.env.PORT || 5000;

app.listen(port, function () {
    logger.info("Listening on " +  port);
});
