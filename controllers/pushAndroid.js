/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    gcm = require("node-gcm"),
    DeviceModel = require("../models/device"),
    buildMessage = require("./buildNotification");

var retryCount = 3;

/**
 *
 * @param {Array} results
 * @returns {boolean}
 */
var checkIfUninstall = function(results) {
    if (!results) {
        return false;
    }

    for (var i=0;i<results.length;i++) {
        var currentResult = results[i];

        if (currentResult.error === "NotRegistered") {
            return true;
        }
    }

    return false;
};

var pushAndroidNotification = function(application, device, notification) {
    // create a message with default values
    var message = buildMessage(notification, "android", "data", gcm.Message),
        sender = new gcm.Sender(application.android.gcm_api_key),
        registrationIds = [device.token];

    sender.send(message, registrationIds, retryCount, function (err, result) {
        if (result && result.failure) {
            if (checkIfUninstall(result.results)) {
                logger.info(util.format("%s device %s alias: %s has unregister, deactivation it", application.name, device.token, device.alias));
                DeviceModel.deactivateByToken(application, device.token);
            } else {
                logger.error(util.format("%s failed to send push %s %s %s %s", application.name, device.token, device.alias, err, JSON.stringify(result)));
            }
        } else if (err) {
            logger.error(util.format("%s failed to send push: %s %s %s", application.name, device.token, device.alias, err));
        } else {
            logger.info(util.format("%s finish sending to token: %s alias: %s - %s", application.name, device.token, device.alias, JSON.stringify(result)))
        }
    });
};

module.exports = {
    push: pushAndroidNotification
};
