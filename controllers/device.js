/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
	logger = require("../logger"),
	util = require("util");

var iosTokenLength = 64,
    apidTokenLength = 36;

function isCaseInsenseticeToken(token) {
    return token.length <= iosTokenLength;
}

/**
 *
 * @param {String|ApplicationModel} application
 * @param {string} platform
 * @param {string} token
 * @param {string} alias
 * @param {Array} tags
 * @param {function} callback
 */
var createDevice = function(application, platform, token, alias, tags, callback) {
	if (isCaseInsenseticeToken(token)) {
        token = token.toUpperCase();
    }

    function createOrUpdate(device) {
        if (!device) {
            device = new DeviceModel();
            device.token = token;
            device._application =  application._id || application;
        }

        device.platform = platform;
        device.alias = alias;
        device.active = true;
        device.tags = tags;

        return device;
    }

    if (!callback) {
        return DeviceModel.findOneQ({token: token, _application: application._id})
            .then(function(device) {
                return createOrUpdate(device).saveQ();
            });
    } else {
        DeviceModel.findOne({token: token, _application: application._id}, function (err, device) {
            if (err) {
                logger.error(util.format("failed to look for device %s", err));
                return callback(err);
            }

            createOrUpdate(device).save(function (err, device) {
                if (err) {
                    logger.error(util.format("failed to save device %s", err), err);
                }

                callback(err, device);
            });
        });
    }
};

/**
 *
 * @param {ApplicationModel} application
 * @param {string} token
 * @param {function} callback
 */
var deactivateDevice = function(application, token, callback) {
    if (isCaseInsenseticeToken(token)) {
        token = token.toUpperCase();
    }

	DeviceModel.update({token: token, _application: application._id}, {$set: {active: false}}, function (err) {
		if (err) {
			logger.error(util.format("failed to look for device %s", err));

		}

		return callback(err);
	});
};

/**
 *
 * @param {ApplicationModel} application
 * @param {object} audience
 * @param {function} callback
 */
var getByAudience = function (application, audience, callback) {
	var condition = [];

	if (audience.alias) {
		condition.push({alias: audience.alias});
	}

	if (audience.device_token) {
        if (isCaseInsenseticeToken(audience.device_token)) {
            audience.device_token = audience.device_token.toUpperCase();
        }

		condition.push({token: audience.device_token});
	}

	if (audience.apid) {
		condition.push({_id: audience.apid});
	}

    if (audience.tags) {
        condition.push({tags: audience.tags});
    }

    DeviceModel.find(
		{
			$or: condition,
			_application: application._id
		},
		function(err, devices) {
			if (err) {
				logger.error(util.format('failed to find devices by %s %s', JSON.stringify(audience), err), err);
			}

			callback(err, devices);
		}
	);
};

module.exports = {
	getByAudience: getByAudience,
	create: createDevice,
	deactivate: deactivateDevice
};
