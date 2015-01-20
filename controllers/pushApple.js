/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    buildMessage = require("./buildNotification"),
    apn = require("apn");

var	feedbacks = {};

function onError(err, notification) {
    logger.error(util.format("Failed to send notification %s", err));
}

function getEndpoint(production) {
    return production ? "gateway.push.apple.com" : "gateway.sandbox.push.apple.com";
}

function getOptions(application) {
    return {
        pfx: application.ios.pfxData,
        passphrase: application.ios.passphrase,
        gateway: getEndpoint(application.production),
        port: 2195,
        enhanced: true,
        errorCallback: onError
    };
}

function createFeedbackIfNeeded(application) {
    if (feedbacks[application.name]) {
        return;
    }

    var feedbackOptions = {
        pfx: application.ios.pfxData,
        passphrase: application.ios.passphrase,
        gateway: getEndpoint(application.production),
        port: 2196,
        batchFeedback: application.production,
        interval: 3600
    };

    var feedback = new apn.Feedback(feedbackOptions);

    if (application.production) {
        feedback.on("feedback", function (devices) {
            logger.info(util.format("got feedback on %s time %s %s", application.name, devices));

            devices.forEach(function (item) {
                // Do something with item.device and item.time;
            });
        });
    } else {
        feedback.on("feedback", function (device, time) {
            logger.info(util.format("got feedback on %s time %s %s %s", application.name, device, time));

            Device.find({token: buffer}, function(err, devices) {
                devices.forEach(function (device) {
                    logger.debug(util.format("device token %s is now inactive", device));
                    device.status = "inactive";
                    device.save(function (err) {
                        if (err !== null) {
                            logger.error(util.format("failed to save %s: %s", buffer, err));
                        }
                    });
                });
            });
        });
    }

    logger.debug(util.format("push devices: %s application: %s", application));


    feedbacks[application.name] = feedback;
}

/**
 *
 * @param {ApplicationModel} application
 * @param {DeviceModel} device
 * @param {object} notification
 */
var pushAppleNotification = function(application, device, notification) {
    createFeedbackIfNeeded(application);

    var options = getOptions(application);

    logger.debug(util.format("connection options %s", JSON.stringify(options)));

    var apnsConnection = new apn.Connection(options),
        message = buildMessage(notification, "ios", "payload", apn.Notification);

    apnsConnection.pushNotification(message, new apn.Device(device.token));
};

module.exports = {
    push: pushAppleNotification
};
