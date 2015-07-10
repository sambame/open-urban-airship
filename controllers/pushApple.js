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

function getEndpoint(production) {
    return production ? "gateway.push.apple.com" : "gateway.sandbox.push.apple.com";
}

function getOptions(application) {
    return {
        pfx: application.ios.pfxData,
        passphrase: application.ios.passphrase,
        gateway: getEndpoint(application.production),
        port: 2195,
        production: application.production,
        enhanced: true
    };
}

function deactivateDevice(application, apnDevice, deactivationTime) {
    var token = apnDevice.toString().toUpperCase(),
        time = new moment(deactivationTime * 1000).toDate();

    return DeviceModel.deactivateByToken(application, token, time);
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
        production: application.production,
        interval: 3600
    };

    var feedback = new apn.Feedback(feedbackOptions);

    if (application.production) {
        feedback.on("feedback", function (devicesAndTimes) {
            logger.info(util.format("got feedback on %s %s", application.name, JSON.stringify(devicesAndTimes)));

            devicesAndTimes.forEach(function (deviceAndTime) {
                deactivateDevice(application, deviceAndTime.device, deviceAndTime.time);
            });
        });
    } else {
        feedback.on("feedback", function (device, time) {
            logger.info(util.format("got feedback on %s time '%s' '%s'", application.name, device, time));

            deactivateDevice(application, device, time);
        });
    }

    logger.debug(util.format("push devices: %s application: %s", application));

    feedbacks[application.key] = feedback;

    feedback.on("error", function (feedbackErr) {
        logger.error(util.format("%s: feedback error %s", application.name, feedbackErr), feedbackErr);
        delete feedbacks[application.key];
    });
}

function wireService(application, service) {
    if (!application.production) {
        service.on('transmitted', function (notification, device) {
            logger.info(util.format("%s notification transmitted to: %s", application.name, device.token.toString('hex')));
        });
    }

    service.on('transmissionError', function (errCode, notification, device) {
        logger.error(util.format("%s notification caused error: %s for device %s %s", application.name, errCode, device, notification), notification);
        if (errCode === 8) {
            logger.error("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
        }

        if (errCode == 10) {
            logger.warn(util.format("%s got shutdown from APN", application.name));
            delete feedbacks[application.key];
            delete connections[application.key];
        }
    });

    service.on('timeout', function () {
        logger.warn(util.format("%s connection Timeout", application.name));
    });

    service.on('disconnected', function () {
        logger.warn(util.format("%s disconnected from APNS", application.name));
    });

    service.on('socketError',  function (err) {
        logger.warn(util.format("%s socket error %s", application.name, err), err);
    });

    service.on('error',  function (err) {
        logger.error(util.format("%s error %s", application.name, err), err);
    });

    return service;
}

/**
 *
 * @param {ApplicationModel} application
 * @returns apn.Connection
 *
 */

function createConnectionIfNeeded(application) {
    if (!connections[application.key]) {
        var options = getOptions(application);

        logger.info(util.format("connection options %s", JSON.stringify(options)));

        connections[application.key] = wireService(application, new apn.Connection(options));
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
