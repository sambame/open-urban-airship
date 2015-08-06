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

function isProductionCertificate(certificate, productionHint) {
    if (certificate.production && certificate.sandbox) {
        return productionHint;
    }

    return certificate.production;
}

/**
 *
 * @param {ApplicationModel} application
 * @param {String} name
 * @param {Boolean} production
 * @returns {*}
 */
function getCertificateNamed(application, name, production) {
    name = name || "default";

    if (name === "default") {
        var certificateParams = {};
        if (_.isUndefined(application.ios.production)) {
            certificateParams.production = application.production;
            certificateParams.sandbox = !certificateParams.production;
        } else {
            certificateParams.production = application.ios.production;
            certificateParams.sandbox = application.ios.sandbox;
        }

        return {
            pfx: application.ios.pfxData,
            passphrase: application.ios.passphrase,
            production: isProductionCertificate(certificateParams, production)
        };
    }

    var certificateIndex = application.indexOfCertificate(name);

    if (certificateIndex === -1) {
        logger.warn(util.format("%s certificate \"%s\" not found", application.name, name));
        return null;
    }

    var selectedCertificate = application.ios_certificates[certificateIndex];
    return {
        pfx: selectedCertificate.pfxData,
        passphrase: selectedCertificate.passphrase,
        production: isProductionCertificate(selectedCertificate, production)
    };
}

function getOptions(certificate, productionHint) {
    var production = isProductionCertificate(certificate, productionHint);
    return {
        pfx: certificate.pfx,
        passphrase: certificate.passphrase,
        gateway: getEndpoint(production),
        port: 2195,
        production: production,
        enhanced: true
    };
}

function deactivateDevice(application, apnDevice, deactivationTime) {
    var token = apnDevice.toString().toUpperCase(),
        time = new moment(deactivationTime * 1000).toDate();

    return DeviceModel.deactivateByToken(application, token, time);
}

/**
 *
 * @param {ApplicationModel} application
 * @param {String} name
 * @param {Boolean} production
 * @returns {string}
 */
function createApplicationNameLookupKey(application, name, production) {
    name = name || "default";

    var suffix = production ? "production" : "sandbox";
    return application.key + "$$$" + name + "$$$" + suffix;
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
 * @param {Boolean} production
 */
function createFeedbackIfNeeded(application, name, production) {
    var certificate = getCertificateNamed(application, name, production);

    if (!certificate) {
        return null;
    }

    var feedbackKey = createApplicationNameLookupKey(application, name, isProductionCertificate(certificate, production));
    if (feedbacks[feedbackKey]) {
        return;
    }

    var feedback = createFeedbackService(
        certificate.pfx,
        certificate.passphrase,
        isProductionCertificate(certificate, production));

    if (certificate.production) {
        feedback.on("feedback", function (devicesAndTimes) {
            logger.info(util.format("got feedback on %s %s", application.name, JSON.stringify(devicesAndTimes)));

            devicesAndTimes.forEach(function (deviceAndTime) {
                deactivateDevice(application, deviceAndTime.device, deviceAndTime.time);
            });
        });
    } else {
        feedback.on("feedback", function (device, time) {
            if (!device) {
                return;
            }

            logger.info(util.format("got feedback on %s time '%s' '%s'", application.name, device, time));

            deactivateDevice(application, device, time);
        });
    }

    logger.debug(util.format("push devices: %s application: %s", application));

    feedbacks[feedbackKey] = feedback;

    feedback.on("error", function (feedbackErr) {
        logger.error(util.format("%s: feedback error %s", application.name, feedbackErr), feedbackErr);
        delete feedbacks[feedbackKey];
    });
}

function wireService(application, name, service, producation) {
    var certificate = getCertificateNamed(application, name, producation);

    if (!certificate.production) {
        service.on('transmitted', function (notification, device) {
            logger.info(util.format("%s notification transmitted to: %s", application.name, device.token.toString('hex')));
        });
    }

    service.on('transmissionError', function (errCode, notification, device) {
        logger.error(util.format("%s notification caused error: %s for device %s %s", application.name, errCode, String(device).toUpperCase(), JSON.stringify(notification)));
        if (errCode === 8) {
            logger.error("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
        }

        if (errCode == 10) {
            logger.warn(util.format("%s got shutdown from APN", application.name));
            delete feedbacks[createApplicationNameLookupKey(application, name, producation)];
            delete connections[createApplicationNameLookupKey(application, name, producation)];
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
 * @parms {Boolean} [production]
 * @returns apn.Connection
 *
 */
function createConnectionIfNeeded(application, name, production) {
    var certificate = getCertificateNamed(application, name, production);

    if (!certificate) {
        return null;
    }

    var key = createApplicationNameLookupKey(application, name, isProductionCertificate(certificate, production));

    if (!connections[key]) {
        var options = getOptions(certificate, production);

        if (!options) {
            return null;
        }

        logger.info(util.format("connection options %s", JSON.stringify(options)));

        connections[key] = wireService(application, name, new apn.Connection(options), isProductionCertificate(certificate, production));
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
    createFeedbackIfNeeded(application, device.ios.ios_certificate_name, !device.ios.sandbox);

    var apnsConnection = createConnectionIfNeeded(application, device.ios.ios_certificate_name, !device.ios.sandbox),
        message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

    if (!apnsConnection) {
        return;
    }

    apnsConnection.pushNotification(message, new apn.Device(device.token));
};

function clearConnections() {
    connections = {};
}

function clearFeedbacks() {
    feedbacks = {};
}

module.exports = {
    push: pushAppleNotification,
    createFeedbackService: createFeedbackService,
    deactivateDevice: deactivateDevice,
    clearConnections: clearConnections,
    clearFeedbacks: clearFeedbacks
};
