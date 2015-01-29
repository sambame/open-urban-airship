/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    gcm = require("node-gcm"),
    buildMessage = require("./buildNotification");

var retryCount = 3;

var pushAndroidNotification = function(application, device, notification) {
    // create a message with default values
    var message = buildMessage(notification, "android", "data", gcm.Message),
        sender = new gcm.Sender(application.android.gcm_api_key),
        registrationIds = [device.token];

    sender.send(message, registrationIds, retryCount, function (err, result) {
        if (err) {
            logger.error(util.format("failed to send push: %s %s %s", device.token, device.alias, err));
        } else if (result && result.failure) {
            logger.error(util.format("failed to send push %s %s %s %s", device.token, device.alias, err, JSON.stringify(result)));
        } else {
            logger.info(util.format("finish sending %s", JSON.stringify(result)))
        }
    });
};

module.exports = {
    push: pushAndroidNotification
};
