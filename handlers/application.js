/*jslint node: true */
/*eslint-env node */
"use strict";

var ApplicationModel = require("../models/application"),
    logger = require("../logger"),
    fs = require('fs'),
    crypto = require("crypto"),
    async = require("async"),
    base64url = require('base64url'),
    Application = require('../controllers/application'),
    path = require('path');

var createSecureRandom = function(callback) {
    crypto.randomBytes(16, function(err, buf) {
        callback(err, base64url(buf));
    });
};

var createApplication = function (req, res) {
    var params = req.body;
    ApplicationModel.findOne({name: params.name}, function(err, application) {
        if (err) {
            logger.error('Failed to register application %s', err);

            res.status(500);
            return res.send('FAILED!');
        }

        if (!application) {
            application = new ApplicationModel();
            application.name = params.name;
        }

        application.development = params.development;

        async.parallel(
            [
                createSecureRandom,
                createSecureRandom,
                createSecureRandom
            ],
            function(err, keys) {
                application.secret_key_push = keys[0];
                application.secret_key = keys[1];
                application.access_key = keys[2];

                logger.debug('saving application %s', params.name);

                application.save(function(err) {
                    if (err) {
                        res.status(500);
                        return res.send('FAILED!');
                    }

                    res.send('OK!');
                });
            }
        );
    });
};

var listApplications = function (req, res) {
    ApplicationModel.find().lean().exec(function(err, applications) {
        if (err) {
            logger.error('Failed to list applications %s', err);

            res.status(500);
            return res.send('FAILED!');
        }

        var apps = [];
        applications.forEach(function(app) {
            apps.push({
                name: app.name,
                secret_key_push: app.secret_key_push,
                secret_key: app.secret_key,
                access_key: app.access_key,
                development: app.development
            });
        });

        res.json({applications: apps});
    });
};

var createAuthToken = function(key, secret) {
    return new Buffer(key + ":" + secret, "utf8").toString("base64");
};

var getByRequestAuth = function (req, extraData, cb, validateSecret) {
    var authorization = req.headers.authorization;
    extraData = extraData || {};

    logger.debug('using authorization %s data %s', authorization, JSON.stringify(extraData));

    if (!authorization) {
        var secret_key = extraData.secret_key || req.query.secret_key;
        var access_key = extraData.access_key || req.query.access_key;

        if (!secret_key || !access_key) {
            cb(new Error('missing authorization'), null);
            return;
        }

        var authorizationString = access_key + ":" + secret_key;
        authorization = "Basic " + new Buffer(authorizationString).toString('base64');
    }

    logger.debug('using authorization %s', authorization);

    var basicMethod = 'Basic';
    if (authorization.startsWith(basicMethod)) {
        authorization = authorization.substring(basicMethod.length + 1, authorization.length);
        authorization = new Buffer(authorization, 'base64').toString('ascii');

        var parts = authorization.split(':');
        var auth_access_key = parts[0];
        var auth_secret = parts[1];

        logger.debug('looking for application %s', auth_access_key);
        ApplicationModel.findOne({
            access_key: auth_access_key
        }, function (err, app) {
            if (err) {
                logger.error('failed to look for application %s', err);
            }
            else if (app) {
                logger.debug('application found: %s (%s)', app, err);
                logger.debug('%s, %s', app.secret_key_push, auth_secret);
                if (app !== null && validateSecret(app, auth_secret) === false) {
                    app = null;
                    err = new Error('Invalid application secret');
                }
            } else {
                err = new Error('application not found');
            }

            cb(err, app);
        });
    } else {
        cb(new Error('Not supported auth ' + authorization), null);
    }
};

var getByRequestAuthMaster = function (req, extraData, cb) {
    logger.debug('looking app by master secret');
    getByRequestAuth(req,
        extraData,
        cb,
        function(app, secret) {
            if (app.secret_key_push !== secret) {
                logger.error(util.format('application master secret mismatch %s!==%s', app.secret_key_push, secret));
            }

            return app.secret_key_push === secret;
        });
};

var getByRequestAuthApp = function (req, extraData, cb) {
    logger.debug('looking app by app secret');
    getByRequestAuth(req,
        extraData,
        cb,
        function(app, secret) {
            if (app.secret_key !== secret) {
                logger.error(util.format('application secret mismatch %s!==%s', app.secret_key, secret));
            }

            return app.secret_key === secret;
        });
};

var configureIOS = function(req, res) {
    if (!req.body.passphrase) {
        return res.status(400).end();
    }

    if (!req.files.pfx) {
        return res.status(400).end();
    }

    async.waterfall(
        [
            function(callback) {
                fs.readFile(req.files.pfx.path, callback);
            },
            function(data, callback) {
                Application.configureIOS(req.user.app, data, req.body.passphrase, function(err) {
                    callback(err);
                });
            },
            function(callback) {
                fs.unlink(req.files.pfx.path, callback);
            }
        ],
        function(err) {
            if (err) {
                return res.status(500);
            }

            res.end();
        }
    );
};

var apis = function(req, res) {
    var filename = path.join(process.cwd(), "/static/discovery/applications-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

module.exports = {
    create: createApplication,
    getByRequestAuthMaster:  getByRequestAuthMaster,
    getByRequestAuthApp: getByRequestAuthApp,
    list: listApplications,
    configureIOS: configureIOS,
    createAuthToken: createAuthToken,
    apis: apis
};
