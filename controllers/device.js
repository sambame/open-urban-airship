/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
	logger = require("../logger"),
	util = require("util");

/**
 *
 * @param {ApplicationModel} application
 * @param {string} platform
 * @param {string} token
 * @param {string} alias
 * @param {Array} tags
 * @param {function} callback
 */
var createDevice = function(application, platform, token, alias, tags, callback) {
	DeviceModel.findOne({token: token, _application: application._id}, function (err, device) {
		if (err) {
			logger.error(util.format("failed to look for device %s", err));
			return callback(err);
		}

		if (!device) {
			device = new DeviceModel();
			device.token = token;
			device._application = application._id;
		}

		device.platform = platform;
		device.alias = alias;
		device.active = true;
        device.tags = tags;

		device.save(function (err, device) {
			if (err) {
				logger.error(util.format("failed to save device %s", err));
			}

			callback(err, device);
		});
	});
};

/**
 *
 * @param {ApplicationModel} application
 * @param {string} token
 * @param {function} callback
 */
var deactivateDevice = function(application, token, callback) {
	DeviceModel.update({token: token, _application: application._id}, {$set: {status: "inactive"}}, function (err) {
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
