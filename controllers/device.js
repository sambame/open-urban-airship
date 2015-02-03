/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
	logger = require("../logger");

var iosTokenLength = 64,
    apidTokenLength = 36;

function isCaseInsensitiveToken(token) {
    if (!token) {
        return false;
    }

    return token.length <= iosTokenLength;
}

/**
 *
 * @param {String|ApplicationModel} application
 * @param {string} apid
 * @param {string} platform
 * @param {string} token
 * @param {string} [alias]
 * @param {Array} [tags]
 */
var createOrUpdateDevice = function(application, apid, platform, token, alias, tags) {
	if (isCaseInsensitiveToken(token)) {
        token = token.toUpperCase();
    }

    function createOrUpdate(device) {
        if (!device) {
            device = new DeviceModel();
            device.token = token;
            device._application =  application._id || application;
        }

        if (platform) {
            device.platform = platform;
        }

        if (alias) {
            device.alias = alias;
        }

        if (tags) {
            device.tags = tags;
        }

        device.active = true;

        return device;
    }

    var findQ = null;
    if (apid) {
        findQ = DeviceModel.findOneQ({_id: apid, _application: application._id})
    } else {
        findQ = DeviceModel.findOneQ({token: token, _application: application._id})
    }

    return findQ.then(function(device) {
            return createOrUpdate(device).saveQ();
        });
};

/**
 *
 * @param {ApplicationModel} application
 * @param {string} apid
 * @param {string} [token]
 */
var deactivateDevice = function(application, apid, token) {
    if (token && isCaseInsensitiveToken(token)) {
        token = token.toUpperCase();
    }

    var conditions = apid ? {_id: apid} : {token: token};
    conditions._application = application._id;

	return DeviceModel.updateQ(conditions, {$set: {active: false}});
};

/**
 *
 * @param {ApplicationModel} application
 * @param {object} audience
 */
var getByAudience = function (application, audience) {
	var conditions = [];

	if (audience.alias) {
		conditions.push({alias: audience.alias});
	}

	if (audience.device_token) {
        if (isCaseInsensitiveToken(audience.device_token)) {
            audience.device_token = audience.device_token.toUpperCase();
        }

		conditions.push({token: audience.device_token});
	}

	if (audience.apid) {
		conditions.push({_id: audience.apid});
	}

    if (audience.tags) {
        conditions.push({tags: audience.tags});
    }

    var condition = {
        $and: [
            {$or: conditions},
            {_application: application._id}
        ]
    };

    return DeviceModel.findQ(condition);
};

module.exports = {
	getByAudience: getByAudience,
	createOrUpdate: createOrUpdateDevice,
	deactivate: deactivateDevice
};
