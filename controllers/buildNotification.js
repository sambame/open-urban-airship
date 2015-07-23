/*jslint node: true */
/*eslint-env node */
"use strict";

var fixAndroidNotificationParams = function(message) {
    message.notification = message.notification || {};

    message.data = message.data || {};

    if (message.alert) {
        if (message.alert["loc-key"]) {
            message.notification["body_loc_key"] = message.alert["loc-key"];

            if (message.alert["loc-args"]) {
                message.notification["body_loc_args"] = message.alert["loc-args"];
            }
        } else {
            message.notification.body = message.alert;
        }
        delete message.alert;
    }

    if (message.data.alert) {
        if (message.data.alert["loc-key"]) {
            message.notification["body_loc_key"] = message.data.alert["loc-key"];

            if (message.data.alert["loc-args"]) {
                message.notification["body_loc_args"] = message.data.alert["loc-args"];
            }
        } else {
            message.notification.body = message.data.alert;
        }
        delete message.alert;
    }

    if (message.notification.alert) {
        message.notification.body = message.notification.alert;
        delete message.notification.alert;
    }

    if (message.sound) {
        message.notification.sound = message.sound;
        delete message.sound;
    }

    if (message.data.sound) {
        message.notification.sound = message.data.sound;
        delete message.data.sound;
    }

    if (message.title) {
        message.notification.title = message.title;
        delete message.title;
    }

    if (message.data.title) {
        message.notification.title = message.data.title;
        delete message.data.title;
    }

    if (message.icon) {
        message.notification.icon = message.icon;
        delete message.icon;
    }

    if (message.data.icon) {
        message.notification.icon = message.data.icon;
        delete message.data.icon;
    }

    if (message.badge) {
        message.notification.badge = message.badge;
        delete message.badge;
    }

    if (message.data.badge) {
        message.notification.badge = message.data.badge;
        delete message.data.badge;
    }

    if (message.tag) {
        message.notification.tag = message.tag;
        delete message.tag;
    }

    if (message.data.tag) {
        message.notification.tag = message.data.tag;
        delete message.data.tag;
    }

    if (message["click-action"]) {
        message.notification["click-action"] = message["click-action"];
        delete message["click-action"];
    }

    if (message.data["click-action"]) {
        message.notification["click-action"] = message.data["click-action"];
        delete message.data["click-action"];
    }

    if ((message.notification || {}).sound) {
        message.notification.sound = "default";
    }
};

function fixiOSNotificationParams(notification) {
    if (notification["content-available"]) {
        notification.contentAvailable = notification["content-available"] ? true : false;
        delete notification["content-available"];
    }
}


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

    if (platform === "android") {
        fixAndroidNotificationParams(msg);
    } else if (platform === "ios") {
        fixiOSNotificationParams(msg);
    }

    return msg;
}

module.exports = buildMessage;
