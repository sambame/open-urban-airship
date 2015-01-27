/*jslint node: true */
/*eslint-env node */
"use strict";

/**
 *
 * @param {object} notification
 * @param {string} platform
 * @param {function} platformNotificationClass
 * @param {string} platformDataKey
 * @returns {object}
 */
function buildMessage(notification, platform, platformDataKey, platformNotificationClass) {
    function isReservedProperty(propertyName) {
        var properties = {
            android: 1,
            ios: 1,
            amazon: 1,
            blackberry: 1,
            mpns: 1,
            wns: 1,
            extra: 1
        };

        return propertyName in properties;
    }

    var msg = new platformNotificationClass();

    for (var key in notification) {
        if (!notification.hasOwnProperty(key)) {
            continue;
        }

        if (isReservedProperty(key)) {
            continue;
        }

        msg[key] = notification[key];
    }

    var platformOverride = notification[platform] || {};

    for (var platformOverrideKey in platformOverride) {
        if (!platformOverride.hasOwnProperty(platformOverrideKey)) {
            continue;
        }

        if (isReservedProperty(platformOverrideKey)) {
            continue;
        }

        msg[platformOverrideKey] = platformOverride[platformOverrideKey];
    }

    var extra = notification.extra || {};

    for (var extraKey in extra) {
        if (!extra.hasOwnProperty(extraKey)) {
            continue;
        }

        msg[platformDataKey][extraKey] = extra[extraKey];
    }

    var platformExtra = platformOverride.extra || {};

    for (var platformExtraKey in platformExtra) {
        if (!platformExtra.hasOwnProperty(platformExtraKey)) {
            continue;
        }

        msg[platformDataKey][platformExtraKey] = platformExtra[platformExtraKey];
    }

    return msg;
}

module.exports = buildMessage;
