/*jslint node: true */
/*eslint-env node */
"use strict";

var DeviceModel = require("../models/device"),
    Device = require("../controllers/device"),
    logger = require("../logger"),
    sinceToDate = require('../sinceToDate'),
    generalConfig = require("config").general,
    moment = require("moment"),
    _ = require("lodash"),
    util = require("util");

var supportedPlatforms = ["ios", "android", "test"];

var deleteDevice = function (req, res) {
    if (!req.params.token && !req.params.apid) {
        return res.status(400).end();
    }

    logger.info(util.format("deleteDevice %s", JSON.stringify(req.body)));

    Device.deactivate(req.user.app, req.params.apid, req.params.token)
        .then(function() {
            res.status(204).json({
                ok: true
            });
        })
        .catch(function(err) {
            logger.error(util.format("%s failed to deactivate device %s", req.user.app.name, err), err);
            return res.status(500).json({
                ok: false
            });
        });
};

var createDevice = function (req, res) {
    if (!req.params.token && !req.params.apid) {
        return res.status(400).end();
    }

    logger.info(util.format("%s createDevice %s on token %s", req.user.app.name, JSON.stringify(req.body), req.params.token || req.params.apid));

    var platform = req.body.platform;
    if (platform && _.isString(platform) === false) {
        return res.status(400).end();
    }

    var apid = req.params.apid,
        isAPID = !!apid,
        deviceToken = isAPID ? req.body.apid : req.params.token;

    if (!platform && !isAPID) {
        if (req.params.token.length === 64) {
            platform = "ios"
        } else {
            platform = "android"
        }
    }

    if (platform) {
        platform = platform.toLowerCase();

        if (supportedPlatforms.indexOf(platform) === -1) {
            return res.status(400).end();
        }
    }

    if (DeviceModel.isGCMToken(deviceToken)) {
        platform = "android";
    }

    if (deviceToken && platform === "ios") {
        deviceToken = deviceToken.toLowerCase();
    }

    var params = req.body;

    Device.createOrUpdate(req.user.app, apid, platform, deviceToken, params.alias, params.tags, params.iosCertificateName || params.ios_certificate_name)
        .then(function(device) {
            if (!device) {
                res.json({
                    ok: false,
                    message: "NotFound"
                });

                return;
            }

            res.json({
                ok: true,
                apid: device.apid
            });
        })
        .catch(function(err) {
            logger.error(util.format("%s failed to createOrUpdate (apid: %s, token: %s) device %s", req.user.app.name, apid, deviceToken, err), err);
            return res.status(400).json({
                message: err.message,
                ok: false
            });
        });
};

var listDevices = function (req, res) {
    if (!req.user.masterAuth) {
        return res.status(401).end()
    }

    DeviceModel.find().lean().exec(function(err, devices) {
        var deviceTokens = [],
            activeDevices = 0;

        if (err) {
            logger.error(util.format("%s failed to query feedback %s", req.user.app.name, err), err);
            return res.status(500).json({ok:  false, message: err.message});
        }

        devices.forEach(function(device) {
            var deviceToken = {device_token: device.token, active: device.status === 'active', apid: device.apid};

            if (device.alias) {
                deviceToken.alias = device.alias;
            }

            if (device.tags) {
                deviceToken.tags = device.tags;
            }

            if (deviceToken.active) {
                activeDevices += 1;
            }

            deviceTokens.push(deviceToken);
        });

        var list = {
            device_tokens_count: deviceTokens.length,
            device_tokens: deviceTokens,
            active_device_tokens_count: activeDevices
        };

        res.json(list);
    });
};


var feedbackDevices = function(req, res) {
    var dateRange = sinceToDate(req.query.since),
        now = new Date();


    var maxDateBack =  now.setDate((new Date()).getDate() - generalConfig.maxFeedbackDaysBack);

    dateRange = dateRange || maxDateBack;

    if (dateRange < maxDateBack) {
        dateRange = maxDateBack;
    }

    DeviceModel.find({$and: [{active: false}, {last_deactivation_date: {$gt: dateRange}}]}).sort({last_deactivation_date: 1}).lean().exec(function(err, devices) {
        if (err) {
            logger.error(util.format("%s failed to query feedback %s", req.user.app.name, err), err);
            return res.status(500).json({ok:  false, message: err.message});
        }

        var deviceTokens = devices.map(function(device) {
            var deviceToken = {device_token: device.token, marked_inactive_on: moment(device.last_deactivation_date).format("YYYY-MM-DD hh:mm:ss")};

            if (device.alias) {
                deviceToken.alias = device.alias;
            } else {
                deviceToken.alias = null;
            }

            return deviceToken;
        });

        res.json(deviceTokens);
    });
};

module.exports = {
    put: createDevice,
    list: listDevices,
    feedback: feedbackDevices,
    "delete": deleteDevice
};
