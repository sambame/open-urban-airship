/*jslint node: true */
/*eslint-env node */
"use strict";

var DeviceModel = require("../models/device"),
    Device = require("../controllers/device"),
    logger = require("../logger"),
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
            logger.error(util.format("failed to deactivate device %s", err));
            return res.status(500).json({
                ok: false
            });
        });
};

var createDevice = function (req, res) {
    if (!req.params.token && !req.params.apid) {
        return res.status(400).end();
    }

    logger.info(util.format("createDevice %s", JSON.stringify(req.body)));

    var platform = req.body.platform;
    if (platform && typeof platform !== "string") {
        return res.status(400).end();
    }

    var apid = req.params.apid,
        isAPID = !!apid,
        deviceToken = isAPID ? req.body.params : req.params.token;

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


    if (deviceToken && platform === "ios") {
        deviceToken = deviceToken.toLowerCase();
    }

    var params = req.body;

    Device.createOrUpdate(req.user.app, apid, platform, deviceToken, params.alias, params.tags)
        .then(function(device) {
            res.json({
                ok: true,
                apid: device.apid
            });
        })
        .catch(function(err) {
            logger.error(util.format("failed to look for device %s", err)), err;
            return res.status(500).json({
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
        var deviceTokens = [];
        var activeDevices = 0;

        if (err) {
            return res.status(500).end();
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

        res.contentType('json');
        res.send(list);
    });
};

module.exports = {
    put: createDevice,
    list: listDevices,
    "delete": deleteDevice
};
