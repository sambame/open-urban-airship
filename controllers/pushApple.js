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

function createFeedbackIfNeeded(application) {
    if (feedbacks[application.name]) {
        return;
    }

    var feedbackOptions = {
        cert: application.apple_push_certificate_filename,
        certData: application.apple_push_certificate,
        key:  application.apple_push_key_filename,
        keyData: application.apple_push_key,
        passphrase: application.passphrase,
        ca: application.ca,
        address: application.development ? "feedback.sandbox.push.apple.com" : "feedback.push.apple.com",
        port: 2196,
        feedback: function(time, buffer) {
            onFeedback(application, time, buffer);
        },
        interval: 3600
    };

    var feedback = new apn.Feedback(feedbackOptions);

    logger.debug(util.format("push devices: %s application: %s", application));

    feedbacks[application.name] = feedback;
}

function onFeedback(application, time, buffer) {
    logger.info(util.format("got feedback on %s time %s %s", application.name, time, buffer));
    DeviceModel.find({token: buffer, _application: application._id}, function(err, devices) {
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
            wns: 1,

            badge: 1,
            alert: 1,
            sound: 1,
            "content-available": 1,
            extra: 1,
            expiry: 1,
            priority: 1
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

    return note;
}

function getOptions(application) {
    var options = {
        passphrase: application.passphrase,
        gateway: application.development ? "gateway.sandbox.push.apple.com" : "gateway.push.apple.com",
        port: 2195,
        enhanced: true,
        errorCallback: onError
    };

    if (application.apple_push_certificate !== undefined && application.apple_push_certificate.length > 0) {
        options.certData = application.apple_push_certificate;
    } else {
        options.cert = application.apple_push_certificate_filename;
    }

    if (application.apple_push_key !== undefined && application.apple_push_key.length > 0) {
        options.keyData = application.apple_push_key;
    } else {
        options.key = application.apple_push_key_filename;
    }

    return options;
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
