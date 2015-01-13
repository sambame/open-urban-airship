/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
	logger = require("../logger"),
	util = require("util"),
	apns = require('apn');

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

		if (platform === "ios") {
			try {
				new apns.Device(deviceToken);
			} catch (Error) {
				return callback(new Error("invalid device token"));
			}
		}

		device.platform = platform;
		device.alias = alias;
		device.status = 'active';

		device.save(function (err) {
			if (err) {
				logger.error(util.format("failed to save device %s", err));
			}

			callback(err, device);
		});
	});
};

var getByAudience = function (application, audience, cb) {
	DeviceModel.find(
		{
			$or: [
				{alias: audience.alias},
				{token: audience.device_token}
			],
			_application: application._id
		},
		function(err, devices) {
			if (err) {
				logger.error(util.format('failed to find devices by alias %s', err));
			}

			cb(err, devices);
		}
	);
};

module.exports = {
	getByAudience: getByAudience,
	create: createDevice
};
