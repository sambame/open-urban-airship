/*jslint node: true */
/*eslint-env node */
"use strict";
var _ = require("lodash");

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
        delete message.data.alert;
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

    if (message["content-available"]) {
        message.contentAvailable = message["content-available"] ? true : false;
        delete message["content-available"];
    }

    if (message.data["content-available"]) {
        message.contentAvailable = message.data["content-available"] ? true : false;
        delete message.data["content-available"];
    }

    if (message.notification["content-available"]) {
        message.contentAvailable = message.notification["content-available"] ? true : false;
        delete message.notification["content-available"];
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
 * @param {string} dataPlatform
 * @param {string} platform
 * @param {function} platformNotificationClass
 * @param {string} platformDataKey
 * @returns {object}
 */
function buildMessage(notification, dataPlatform, platform, platformDataKey, platformNotificationClass) {
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

    _.forOwn(notification, function(val, key) {
        if (isReservedProperty(key)) {
            return;
        }

        msg[key] = val;
    });

    var platformOverride = notification[dataPlatform] || {};

    _.forOwn(platformOverride, function(val, platformOverrideKey) {
        if (isReservedProperty(platformOverrideKey)) {
            return;
        }

        msg[platformOverrideKey] = val;
    });

    var extra = notification.extra || {};

    _.forOwn(extra, function(val, extraKey) {
        msg[platformDataKey][extraKey] = val;
    });

    var platformExtra = platformOverride.extra || {};

    var handleAPS = (dataPlatform == "ios" && platform !== dataPlatform);

    msg[platformDataKey] = msg[platformDataKey] || {};

    if (handleAPS) {
        _.forOwn(platformExtra.aps, function(val, platformExtraKey) {
            msg[platformDataKey][platformExtraKey] = val;
        });
    }

    _.forOwn(platformExtra, function(val, platformExtraKey) {
        if (handleAPS && platformExtraKey === "aps") {
            return;
        }
        msg[platformDataKey][platformExtraKey] = val;
    });

    if (platform === "android") {
        fixAndroidNotificationParams(msg);
    } else if (platform === "ios") {
        fixiOSNotificationParams(msg);
    }

    return msg;
}

module.exports = buildMessage;
