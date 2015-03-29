/*jslint node: true */
/*eslint-env node */
"use strict";
var logger = require("../logger"),
    util = require("util"),
    gcm = require("node-gcm"),
    DeviceModel = require("../models/device"),
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

/**
 *
 * @param {Array} results
 * @returns {boolean}
 */
var checkIfSwitchedToken = function(results) {
    if (!results) {
        return false;
    }

    for (var i=0;i<results.length;i++) {
        var currentResult = results[i];

        if (currentResult.registration_id) {
            return currentResult.registration_id;
        }
    }

    return false;
};

var pushAndroidNotificationUsingSender = function(gcmSender, application, device, notification, callback) {
    // create a message with default values
    var message = buildMessage(notification, "android", "data", gcm.Message),
        registrationIds = [device.token];

    gcmSender.send(message, registrationIds, retryCount, function (err, result) {
        if (result && result.failure) {
            if (checkIfUninstall(result.results)) {
                logger.info(util.format("%s device %s alias: %s has unregister, deactivation it", application.name, device.token, device.alias));
                DeviceModel.deactivateByToken(application, device.token)
                    .then(function() {
                        if (callback) {
                            callback(err, result);
                        }
                    });

                return;
            }

            logger.error(util.format("%s failed to send push %s %s %s %s", application.name, device.token, device.alias, err, JSON.stringify(result)));
        } else if (err) {
            logger.error(util.format("%s failed to send push: %s %s %s", application.name, device.token, device.alias, err));
        } else {
            var switchedToken = checkIfSwitchedToken(result.results);

            if (switchedToken) {
                logger.info(util.format("%s: token switched %s => %s", application.name, device.token, switchedToken))
                DeviceModel.updateQ({_id: device._id}, {$set: {token: switchedToken}})
                    .then(function() {
                        // resend
                        pushAndroidNotificationUsingSender(gcmSender, application, device, notification, callback);
                    })
                    .catch(function(err) {
                        callback(err);
                    })
            } else {
                logger.info(util.format("%s finish sending to token: %s alias: %s - %s", application.name, device.token, device.alias, JSON.stringify(result)))
            }
        }

        if (callback) {
            callback(err, result);
        }
    });
};

var pushAndroidNotification = function(application, device, notification, callback) {
    pushAndroidNotificationUsingSender(new gcm.Sender(application.android.gcm_api_key), application, device, notification, callback);
};

module.exports = {
    push: pushAndroidNotification,
    pushWithSender: pushAndroidNotificationUsingSender
};
