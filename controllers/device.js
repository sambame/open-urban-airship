/*jslint node: true */
/*eslint-env node */
"use strict";
var DeviceModel = require("../models/device"),
    uuid = require("node-uuid"),
    _ = require("lodash"),
	logger = require("../logger");

/**
 *
 * @param {ApplicationModel} application
 * @param {string} apid
 * @param {string} platform
 * @param {string} token
 * @param {string} [alias]
 * @param {Array} [tags]
 * @param {String} [iosCertificateName]
 * @param {Boolean} [sandbox]
 */
var createOrUpdateDevice = function(application, apid, platform, token, alias, tags, iosCertificateName, sandbox) {
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
        updateParams.$set.actual_platform = platform;
    }

    if (alias) {
        updateParams.$set.alias = alias;
    }

    if (tags) {
        updateParams.$set.tags = tags;
    }

    if (DeviceModel.isGCMToken(token)) {
        updateParams.$set.actual_platform = "android";
    }

    updateParams.$set.active = true;
    updateParams.updated_at = currentTime;

    if (_.isUndefined(iosCertificateName) === false || _.isUndefined(sandbox) === false) {
        updateParams.$set.ios = {ios_certificate_name: iosCertificateName, sandbox: sandbox};
    }

    if (alias) {
        // the the previously registered alias
        return DeviceModel.updateQ({alias: alias, _application: application._id}, {$unset: {alias: ""}}, {multiple: true})
            .then(function() {
                return DeviceModel.findOneAndUpdateQ(updateQueryParams, updateParams, {upsert: upsert, new: true});
            })
    } else {
        return DeviceModel.findOneAndUpdateQ(updateQueryParams, updateParams, {upsert: upsert, new: true});
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
		conditions.push({_application: application._id, alias: audience.alias});
	}

	if (audience.device_token) {
        if (DeviceModel.isCaseInsensitiveToken(audience.device_token)) {
            audience.device_token = audience.device_token.toUpperCase();
        }

		conditions.push({_application: application._id, token: audience.device_token});
	}

	if (audience.apid) {
		conditions.push({_application: application._id, _id: audience.apid});
	}

    if (audience.tags) {
        conditions.push({_application: application._id, tags: audience.tags});
    }

    return DeviceModel.findQ({$or: conditions});
};

module.exports = {
	getByAudience: getByAudience,
	createOrUpdate: createOrUpdateDevice,
	deactivate: deactivateDevice
};
