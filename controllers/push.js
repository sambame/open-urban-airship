/*jslint node: true */
/*eslint-env node */
"use strict";
var minioc = require("minioc"),
    logger = require("../logger"),
    util = require("util"),
    Device = require("./device");

var push = function(application, audience, notification, callback) {
    Device.getByAudience(application, audience, function (err, devices) {
        if (err) {
            return callback(err);
        }

        for (var i=0;i<devices.length;i++) {
            var currentDevice = devices[i];

            if (!currentDevice.active) {
                logger.debug(util.format("device %s active %s", currentDevice.token, currentDevice.active));
                continue;
            }

            minioc.get("push-" + currentDevice.platform).push(application, currentDevice, notification);

            logger.debug(util.format("%s: sending push notification %s to %s", application.name, JSON.stringify(notification), devices[i].apid));
        }

        callback(null, devices);
    });
};

minioc.register("push-ios").as.singleton.factory(function() {
    return require("./pushApple");
});

minioc.register("push-android").as.singleton.factory(function() {
    return require("./pushAndroid");
});

module.exports = {
    push: push
};
