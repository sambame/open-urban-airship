/*jslint node: true */
/*eslint-env node */
"use strict";

var ApplicationModel = require("../models/application"),
    logger = require("../logger"),
    fs = require('fs'),
    crypto = require("crypto"),
    async = require("async"),
    base64url = require('base64url'),
    Application = require('../controllers/application');

var createSecureRandom = function(callback) {
    crypto.randomBytes(16, function(err, buf) {
        callback(err, base64url(buf));
    });
};

var updateApplication = function  (req, res) {
    var params = req.body;

    var application = req.user.app;

    if (params.ios_certificate) {
        application.ios.pfxData = new Buffer(params.ios_certificate, 'base64');
    }

    if (params.passphrase) {
        application.ios.passphrase = params.ios_certificate_password;
    }

    if (params.gcm_api_key) {
        application.android.gcm_api_key = params.gcm_api_key;
    }

    if (params.android_package_name) {
        application.android.android_package_name = params.android_package_name;
    }

    application.save(function(err) {
        if (err) {
            logger.error(util.format("failed to save application"), err);
            res.status(500);
        }

        res.end();
    });
};

var createApplication = function (req, res) {
    var params = req.body;
    async.parallel(
        [
            createSecureRandom,
            createSecureRandom,
            createSecureRandom
        ],
        function(err, keys) {
            Application.create(params.name, !!params.production, keys[0], keys[1], keys[2])
                .then(function(application) {
                    if (params.ios_certificate) {
                        application.ios = {pfxData: new Buffer(params.ios_certificate, 'base64'), passphrase: params.ios_certificate_password};
                    }

                    return application;
                })
                .then(function(application) {
                    if (params.gcm_api_key) {
                        application.android = {gcm_api_key: params.gcm_api_key, android_package_name: params.android_package_name};
                    }

                    return application;
                })
                .then(function(application) {
                    return application.saveQ();
                })
                .then(function(application) {
                    res.json({
                        ok: true,
                        master_secret: application.master_secret,
                        secret: application.secret,
                        key: application.key
                    });
                })
                .catch(function(err) {
                    res.status(500);
                    res.json({
                        ok: false,
                        err: err.message
                    })
                });
        }
    );
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
                master_secret: app.master_secret,
                secret: app.secret,
                key: app.key,
                production: app.production
            });
        });

        res.json({applications: apps});
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

module.exports = {
    create: createApplication,
    update: updateApplication,
    list: listApplications,
    configureIOS: configureIOS
};
