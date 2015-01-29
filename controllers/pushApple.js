/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    buildMessage = require("./buildNotification"),
    DeviceModel = require("../models/device"),
    moment = require("moment"),
    apn = require("apn");

var	feedbacks = {},
    connections = {};

function onError(application) {
    return function(err, notification) {
        if (err == 10) {
            logging.warn(util.format("got shutdown from APN for application %s", application.key));
            delete feedbacks[application.key];
            delete connections[application.key];
            return;
        }

        logger.error(util.format("Failed to send notification %s (%s)", apn.error[err], err));
    }
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
        errorCallback: onError(application)
    };
}

function deactivateDevice(apnDevice, time) {
    var token = apnDevice.toString().toUpperCase(),
        time = time * 1000;

    return DeviceModel.findOneQ({token: token})
        .then(function(device) {
            if (!device) {
                logger.warn(util.format("got feedback on unknown device %s", token));
                return;
            }

            logger.info(util.format("device %s is no longer active", device.alias || device.token));
            device.active = false;
            device.last_deactivation_date = new moment(time).toDate();
            return device.saveQ();
        });
}

function createFeedbackIfNeeded(application) {
    if (feedbacks[application.key]) {
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
        feedback.on("feedback", function (devicesAndTimes) {
            logger.info(util.format("got feedback on %s %s", application.name, JSON.stringify(devicesAndTimes)));

            devicesAndTimes.forEach(function (deviceAndTime) {
                deactivateDevice(deviceAndTime.device, deactivateDevice.time);
            });
        });
    } else {
        feedback.on("feedback", function (device, time) {
            logger.info(util.format("got feedback on %s time '%s' '%s'", application.name, device, time));

            deactivateDevice(device, time);
        });
    }

    logger.debug(util.format("push devices: %s application: %s", application));

    feedbacks[application.key] = feedback;
}

/**
 *
 * @param {ApplicationModel} application
 * @returns apn.Connection
 */

function createConnectionIfNeeded(application) {
    if (!connections[application.key]) {
        var options = getOptions(application);

        logger.info(util.format("connection options %s", JSON.stringify(options)));

        connections[application.key] = new apn.Connection(options)
    }

    return connections[application.key];
}

/**
 *
 * @param {ApplicationModel} application
 * @param {DeviceModel} device
 * @param {object} notification
 */
var pushAppleNotification = function(application, device, notification) {
    createFeedbackIfNeeded(application);

    var apnsConnection = createConnectionIfNeeded(application),
        message = buildMessage(notification, "ios", "payload", apn.Notification);

    apnsConnection.pushNotification(message, new apn.Device(device.token));
};

module.exports = {
    push: pushAppleNotification,
    deactivateDevice: deactivateDevice
};
