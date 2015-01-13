/*jslint node: true */
/*eslint-env node */
"use strict";
var minioc = require("minioc"),
    Device = require("./device");

var push = function(application, audience, notification, callback) {
    Device.getByAudience(application, audience, function (err, devices) {
        if (err) {
            return callback(err);
        }

        for (var i in devices.length) {
            var currentDevice = devices[i];

            if (currentDevice.status !== "active") {
                logger.debug(util.format("device %s status %s", currentDevice.token, currentDevice.status));
                continue;
            }

            minioc.get("push-" + currentDevice.platform).push();

            logger.debug(util.format("%s: sending push notification %s to %s", application.name, JSON.stringify(currentNote), currentNote.device));
        }

        callback();
    });
};

minioc.register("push-ios").as.singleton.factory(function() {
    return require("./push-ios").push;
});

module.exports = {
    push: push
};
