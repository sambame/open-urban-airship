/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    buildMessage = require("./buildNotification"),
    DeviceModel = require("../models/device"),
    moment = require("moment"),
    _ = require("lodash"),
    apn = require("apn");

var	feedbacks = {},
    connections = {};

function getEndpoint(production) {
    return production ? "gateway.push.apple.com" : "gateway.sandbox.push.apple.com";
}

function getCertificateNamed(application, name) {
    name = name || "default";

    if (name === "default") {
        var production = _.isUndefined(application.ios.production) ? application.production : application.ios.production;
        return {pfx: application.ios.pfxData, passphrase: application.ios.passphrase, production: production};
    }

    var certificateIndex = application.indexOfCertificate(name);

    if (certificateIndex === -1) {
        logger.error(util.format("%s certificate %s not found %s", application.name, name));
        return null;
    }

    var selectedCertificate = application.ios.certificates[certificateIndex];
    return {pfx: selectedCertificate.pfxData, passphrase: selectedCertificate.passphrase, production: selectedCertificate.production};
}

function getOptions(application, name) {
    var certificate = getCertificateNamed(application, name);

    if (!certificate) {
        return null;
    }

    return {
        pfx: certificate.pfx,
        passphrase: certificate.passphrase,
        gateway: getEndpoint(certificate.production),
        port: 2195,
        production: certificate.production,
        enhanced: true
    };
}

function deactivateDevice(application, apnDevice, deactivationTime) {
    var token = apnDevice.toString().toUpperCase(),
        time = new moment(deactivationTime * 1000).toDate();

    return DeviceModel.deactivateByToken(application, token, time);
}

function createApplicationNameLookupKey(application, name) {
    name = name || "default";

    return application.key + "$$$" + name;
}

function createFeedbackService(pfx, passphrase, production) {
    var feedbackOptions = {
        pfx: pfx,
        passphrase: passphrase,
        gateway: getEndpoint(production),
        port: 2196,
        batchFeedback: production,
        production: production,
        interval: 3600
    };

    return new apn.Feedback(feedbackOptions);
}

/**
 *
 * @param application
 * @param {String} name
 */
function createFeedbackIfNeeded(application, name) {
    if (feedbacks[createApplicationNameLookupKey(application, name)]) {
        return;
    }

    var certificate = getCertificateNamed(application, name);

    if (!certificate) {
        return null;
    }

    var feedback = createFeedbackService(certificate.pfx, certificate.passphrase, certificate.production);

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

    feedbacks[createApplicationNameLookupKey(application, name)] = feedback;

    feedback.on("error", function (feedbackErr) {
        logger.error(util.format("%s: feedback error %s", application.name, feedbackErr), feedbackErr);
        delete feedbacks[createApplicationNameLookupKey(application, name)];
    });
}

function wireService(application, name, service) {
    var certificate = getCertificateNamed(application, name);

    if (!certificate.production) {
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
            delete feedbacks[createApplicationNameLookupKey(application, name)];
            delete connections[createApplicationNameLookupKey(application, name)];
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
 * @param {String} name
 * @returns apn.Connection
 *
 */

function createConnectionIfNeeded(application, name) {
    var key = createApplicationNameLookupKey(application, name);

    if (!connections[key]) {
        var options = getOptions(application, name);

        if (!options) {
            return null;
        }

        logger.info(util.format("connection options %s", JSON.stringify(options)));

        connections[key] = wireService(application, name, new apn.Connection(options));
    }

    return connections[key];
}

/**
 *
 * @param {ApplicationModel} application
 * @param {DeviceModel} device
 * @param {object} notification
 */
var pushAppleNotification = function(application, device, notification) {
    createFeedbackIfNeeded(application, device.ios_certificate_name);

    var apnsConnection = createConnectionIfNeeded(application, device.ios_certificate_name),
        message = buildMessage(notification, "ios", "payload", apn.Notification);

    if (!apnsConnection) {
        return;
    }

    apnsConnection.pushNotification(message, new apn.Device(device.token));
};

module.exports = {
    push: pushAppleNotification,
    createFeedbackService: createFeedbackService,
    deactivateDevice: deactivateDevice
};
