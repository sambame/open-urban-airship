/*jslint node: true */
/*eslint-env node */
"use strict";

var DeviceModel = require("../models/device"),
    Device = require("../controllers/device"),
    logger = require("../logger"),
    util = require("util"),
    fs = require('fs'),
    path = require('path');

var createDevice = function (req, res) {
    if (!req.params.token) {
        return res.status(400).end();
    }

    var deviceToken = req.params.token.toLowerCase();

    Device.create(req.user.app, req.body.platform, deviceToken, req.body.alias, function(err) {
        if (err) {
            logger.error(util.format("failed to look for device %s", err));
            return res.status(500).end();
        }

        res.end();
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
            var deviceToken = {device_token: device.token, active: device.status === 'active'};

            if (device.alias) {
                deviceToken.alias = device.alias;
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

var apis = function(req, res) {
    var filename = path.join(process.cwd(), "/static/discovery/devices-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

module.exports = {
    put: createDevice,
    list: listDevices,
    apis: apis
};
