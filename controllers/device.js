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
 * @param {function} callback
 */
var createDevice = function(application, platform, token, alias, callback) {
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
		device.status = "active";

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

	DeviceModel.find(
		{
			$or: condition,
			_application: application._id
		},
		function(err, devices) {
			if (err) {
				logger.error(util.format('failed to find devices by alias %s', err));
			}

			callback(err, devices);
		}
	);
};

module.exports = {
	getByAudience: getByAudience,
	create: createDevice
};
