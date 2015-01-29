/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    gcm = require("node-gcm"),
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

function deactivateDevice(device) {
    var token = device.token;

    return DeviceModel.findOneQ({token: token})
        .then(function(device) {
            if (!device) {
                logger.warn(util.format("got deactivate on unknown device %s", token));
                return;
            }

            logger.info(util.format("device %s is no longer active", device.alias || device.token));
            device.active = false;
            device.last_deactivation_date = new Date();
            return device.saveQ();
        });
}

var pushAndroidNotification = function(application, device, notification) {
    // create a message with default values
    var message = buildMessage(notification, "android", "data", gcm.Message),
        sender = new gcm.Sender(application.android.gcm_api_key),
        registrationIds = [device.token];

    sender.send(message, registrationIds, retryCount, function (err, result) {
        if (err) {
            logger.error(util.format("failed to send push: %s %s %s", device.token, device.alias, err));
        } else if (result && result.failure) {
            if (checkIfUninstall(result.results)) {
                deactivateDevice(device);
            } else {
                logger.error(util.format("failed to send push %s %s %s %s", device.token, device.alias, err, JSON.stringify(result)));
            }
        } else {
            logger.info(util.format("finish sending %s", JSON.stringify(result)))
        }
    });
};

module.exports = {
    push: pushAndroidNotification
};
