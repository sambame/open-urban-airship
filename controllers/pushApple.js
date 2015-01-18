/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
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
 * @param {object} notification
 * @param {DeviceModel} device
 * @returns {Notification}
 */
function buildNotification(notification) {
    function isReservedProperty(propertyName) {
        var properties = {
            android: 1,
            ios: 1,
            amazon: 1,
            blackberry: 1,
            mpns: 1,
            wns: 1
        };

        return propertyName in properties;
    }

    var note = new apn.Notification();

    for (var key in notification) {
        if (!notification.hasOwnProperty(key)) {
            continue;
        }

        if (isReservedProperty(key)) {
            continue;
        }

        note[key] = notification[key];
    }

    var ios = notification.ios || {};

    for (var key in ios) {
        if (!ios.hasOwnProperty(key)) {
            continue;
        }

        if (isReservedProperty(key)) {
            continue;
        }

        note[key] = ios[key];
    }

    var extra = notification.extra || {};

    for (var extraKey in extra) {
        if (!extra.hasOwnProperty(extraKey)) {
            continue;
        }

        note.payload[extraKey] = extra[extraKey];
    }

    var iosExtra = ios.extra || {};

    for (var iosExtraKey in iosExtra) {
        if (!iosExtra.hasOwnProperty(iosExtraKey)) {
            continue;
        }

        note.payload[extraKey] = iosExtra[iosExtraKey];
    }

    return note;
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

    var apnsConnection = new apn.Connection(options);

    apnsConnection.pushNotification(buildNotification(notification), new apn.Device(device.token));
};

module.exports = {
    push: pushAppleNotification
};
