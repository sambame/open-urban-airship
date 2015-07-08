/*jslint node: true */
/*eslint-env node */
"use strict";
var minioc = require("minioc"),
    logger = require("../logger"),
    util = require("util"),
    Device = require("./device");

var push = function(application, audience, notification) {
    return Device.getByAudience(application, audience)
        .then(function(devices) {
            if (devices.length === 0) {
                logger.warn(util.format("no device found for %s application key %s", JSON.stringify(audience), application._id));
            }

            var inactiveDevices = [],
                activeDevices = [];

            for (var i=0;i<devices.length;i++) {
                var currentDevice = devices[i];

                if (!currentDevice.active) {
                    inactiveDevices.push(currentDevice);
                    logger.info(util.format("%s: device %s is not active (alias: %s)", application.name, currentDevice.token, currentDevice.alias));
                    continue;
                }

                activeDevices.push(currentDevice);

                minioc.get("push-" + currentDevice.platform).push(application, currentDevice, notification);

                logger.info(util.format("%s: sending push notification %s to %s alias %s", application.name, JSON.stringify(notification), devices[i].apid, devices[i].alias || "(not defined)"));
            }

            return [activeDevices, inactiveDevices]
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
