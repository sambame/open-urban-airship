/*jslint node: true */
/*eslint-env node */
"use strict";

var ApplicationModel = require("../models/application"),
    logger = require("../logger"),
    fs = require('fs'),
    util = require('util'),
    crypto = require("crypto"),
    async = require("async"),
    _ = require("lodash"),
    base64url = require('base64url'),
    validateP12 = require('../validateP12'),
    Application = require('../controllers/application');

var createSecureRandom = function(callback) {
    crypto.randomBytes(16, function(err, buf) {
        callback(err, base64url(buf));
    });
};

var addiOSCertificatesParams = function(application, params) {
    if (application.ios._id) {
        params.production = application.ios.production;
        params.sandbox  = application.ios.sandbox;

        if (application.ios.pushExpirationDate) {
            params.pushExpirationDate = application.ios.pushExpirationDate.toISOString();
        }

        var currentCertificates = {};
        _.forOwn(application.ios.certificate, function(certificate, name) {
            currentCertificates[name] = {
                production: certificate.production,
                sandbox: certificate.sandbox,
                pushExpirationDate: certificate.pushExpirationDate.toISOString()
            }
        });

        params.certificates = currentCertificates;
    }
};

var requestToIOSCertificates = function(req) {
    var iosCertificates = {},
        params = req.body;

    if (params.ios_certificate) {
        var passphrase = params.ios_certificate_password,
            name = (params.ios_certificate_name || "default").toLowerCase();

        iosCertificates[name] = {
            pfx: new Buffer(params.ios_certificate, 'base64'),
            passphrase: passphrase
        };
    } else if (params.ios_certificates) {
        _.forOwn(params.ios_certificates, function(certificate, name) {
            name = (certificate.name || "default").toLowerCase();

            iosCertificates[name] = {
                pfx: new Buffer(certificate.pfx, 'base64'),
                passphrase: certificate.passphrase
            }
        });
    }

    return iosCertificates;
};

var updateApplication = function  (req, res) {
    var params = req.body;

    var application = req.user.app;

    function updateApp(iosCertificates) {
        Application.configureIOS(application, iosCertificates);

        if (params.gcm_api_key) {
            application.android.gcm_api_key = params.gcm_api_key;
        }

        return application.saveQ()
            .then(function(application) {
                var params = {ok: true, key: application._id, name: application.name};

                addiOSCertificatesParams(application, params);

                return res.json(params);
            })
            .catch(function(err) {
                logger.error(util.format("failed to save application"), err);
                res.status(500);

                return res.json({
                    ok: false,
                    err: err.message
                })
            });
    }

    var iosCertificates = requestToIOSCertificates(req);

    validateP12(iosCertificates)
        .then(function (iosCertificates) {
            updateApp(iosCertificates);
        })
        .catch(function (err) {
            logger.info(util.format("failed to validate ios certificate: %s", err), err);
            res.status(400);
            res.json({
                ok: false,
                err: err.message
            })
        });
};

var createApplication = function (req, res) {
    var params = req.body;

    function createApp(iosCertificates) {
        async.parallel(
            [
                createSecureRandom,
                createSecureRandom,
                createSecureRandom
            ],
            function (err, keys) {
                Application.create(params.name, keys[0], keys[1], keys[2])
                    .then(function (application) {
                        Application.configureIOS(application, iosCertificates);

                        return application;
                    })
                    .then(function (application) {
                        if (params.gcm_api_key) {
                            application.android = {
                                gcm_api_key: params.gcm_api_key
                            };
                        }

                        return application;
                    })
                    .then(function (application) {
                        return application.saveQ();
                    })
                    .then(function (application) {
                        res.json({
                            ok: true,
                            master_secret: application.master_secret,
                            secret: application.secret,
                            key: application.key
                        });
                    })
                    .catch(function (err) {
                        logger.error(util.format("failed to create app %s", err), err);
                        res.status(500);
                        res.json({
                            ok: false,
                            err: err.message
                        })
                    });
            }
        );
    }

    var iosCertificates = requestToIOSCertificates(req);

    validateP12(iosCertificates)
        .then(function (iosCertificates) {
            createApp(iosCertificates);
        })
        .catch(function(err) {
            logger.error(util.format("failed to validate ios certificate %s", err), err);
            res.status(400);
            res.json({
                ok: false,
                err: err.message
            });
        });
};

var listApplications = function (req, res) {
    ApplicationModel.find().lean().exec(function(err, applications) {
        if (err) {
            logger.error('Failed to list applications %s', err);

            res.status(500);
            return res.send('FAILED!');
        }

        var apps = [],
            status = 200;

        applications.forEach(function(app) {
            var params = {
                name: app.name,
                master_secret: app.master_secret,
                secret: app.secret,
                key: app.key,
                production: app.production
            };

            if (app.ios && app.ios.pushExpirationDate) {
                params.pushExpirationDate = app.ios.pushExpirationDate;

                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                if (app.ios.pushExpirationDate.getTime() <= tomorrow.getTime()) {
                    status = 499;
                }
            }

            apps.push(params);
        });

        res.status(status);

        res.json({applications: apps});
    });
};

var configureIOS = function(req, res) {
    if (!req.body.passphrase) {
        return res.status(400).end();
    }

    if (!req.pfx) {
        return res.status(400).end();
    }

    async.waterfall(
        [
            function(callback) {
                fs.readFile(req.pfx.path, callback);
            },
            function(data, callback) {
                var name = req.body.name || "default",
                    application = req.user.app,
                    iosCertificates = {};

                iosCertificates[name] = {pfx: data, passphrase: req.body.passphrase};

                validateP12(iosCertificates)
                    .then(function(iosCertificates) {
                        Application.configureIOS(application, iosCertificates);

                        application.save(function(err) {
                            callback(err);
                        })
                    })
                    .catch(function(err) {
                        res.status(400);
                        res.json({
                            ok: false,
                            err: err.message
                        });
                    });
            },
            function(callback) {
                fs.unlink(req.pfx.path, callback);
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
