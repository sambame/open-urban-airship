/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
    uuid = require("node-uuid"),
	logger = require("../logger");

/**
 *
 * @param {ApplicationModel} application
 * @param {string} apid
 * @param {string} platform
 * @param {string} token
 * @param {string} [alias]
 * @param {Array} [tags]
 */
var createOrUpdateDevice = function(application, apid, platform, token, alias, tags) {
	if (DeviceModel.isCaseInsensitiveToken(token)) {
        token = token.toUpperCase();
    }

    var updateParams = {},
        updateQueryParams;

    if (apid) {
        updateQueryParams = {_id: apid, _application: application._id}
    } else {
        updateQueryParams = {token: token, _application: application._id}
    }

    var currentTime = new Date();

    updateParams.$setOnInsert = {_id: uuid(), _application: application._id, created_at: currentTime};

    var upsert = true;
    if (token) {
        updateParams.token = token;
    } else {
        upsert = false;
    }

    updateParams.$set = {};

    if (platform) {
        updateParams.$set.platform = platform;
    }

    if (alias) {
        updateParams.$set.alias = alias;
    }

    if (tags) {
        updateParams.$set.tags = tags;
    }

    updateParams.$set.active = true;
    updateParams.updated_at = currentTime;

    if (alias) {
        return DeviceModel.updateQ({alias: alias,  _application: application._id}, {$unset: {alias: ""}}, {multiple: true})
            .then(function() {
                return DeviceModel.findOneAndUpdateQ(updateQueryParams, updateParams, {upsert: upsert, new: true});
            })
    } else {
        return  DeviceModel.findOneAndUpdateQ(updateQueryParams, updateParams, {upsert: upsert, new: true});
    }
};

/**
 *
 * @param {ApplicationModel} application
 * @param {string} apid
 * @param {string} [token]
 */
var deactivateDevice = function(application, apid, token) {
    if (apid) {
        return DeviceModel.deactivateByAPID(application, apid);
    } else {
        return DeviceModel.deactivateByToken(application, token);
    }
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
        if (DeviceModel.isCaseInsensitiveToken(audience.device_token)) {
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
