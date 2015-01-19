/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    gcm = require("node-gcm"),
    buildMessage = require("./buildNotification");

var pushAndroidNotification = function(application, device, notification) {
    // create a message with default values
    var message = buildMessage(notification, "android", "data", gcm.Message),
        sender = new gcm.Sender(application.android.gcm_api_key),
        registrationIds = [device.token];

    sender.send(message, registrationIds, 3, function (err, result) {
        if (err) {
            logger.error(util.format("failed to send push %s", err));
        }
    });
};

module.exports = {
    push: pushAndroidNotification
};
