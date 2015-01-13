/*jslint node: true */
/*eslint-env node */
"use strict";
var ApplicationModel = require("../models/application"),
	logger = require("../logger");

/**
 *
 * @param {string} key
 * @param {string} secret
 * @returns {string}
 */
var createAuthToken = function(key, secret) {
	return new Buffer(key + ":" + secret, "utf8").toString("base64");
};


/**
 *
 * @param {string} name
 * @param {boolean} development
 * @param {string} access_key
 * @param {string} secret_key_push
 * @param {string} secret_key
 * @param {function} callback
 */
var createApplication = function(name, development, access_key, secret_key_push, secret_key, callback) {
	ApplicationModel.findOne({name: name}, function(err, application) {
		if (err) {
			logger.error('Failed to register application %s', err);

			return callback(err);
		}

		if (!application) {
			application = new ApplicationModel();
			application.name = name;
		}

		application.development = development;
		application.secret_key_push = secret_key_push;
		application.secret_key = secret_key;
		application.access_key = access_key;

		logger.info('saving application %s', name);
		application.save(function(err) {
			return callback(err, application);
		});
	});
};

module.exports = {
	createAuthToken: createAuthToken,
	create: createApplication
};
