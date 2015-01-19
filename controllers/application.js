/*jslint node: true */
/*eslint-env node */
"use strict";
var ApplicationModel = require("../models/application"),
	promisify = require("../promisify");

/**
 *
 * @param {string} name
 * @param {boolean} production
 * @param {string} key
 * @param {string} master_secret
 * @param {string} secret
 * @param {function} callback
 */
var createApplication = function(name, production, key, master_secret, secret, callback) {
	var application = new ApplicationModel();
	application.name = name;

	application.production = production;
	application.master_secret = master_secret;
	application.secret = secret;
	application.key = key;

	callback(null, application);
};

var createApplicationPromise = function(name, production, key, master_secret, secret) {
	var p = promisify(createApplication);

	return p(name, production, key, master_secret, secret);
};

/**
 *
 * @param {ApplicationModel} application
 * @param {Buffer} pfxdata
 * @param {string} passphrase
 * @param {function} callback
 */
var configureIOS = function(application, pfxData, passphrase, callback) {
	application.ios = {pfxData: pfxData, passphrase: passphrase};
	application.save(callback);
};

var getByKey = function(applicationKey) {
	return ApplicationModel.findOneQ({key: applicationKey})
};

module.exports = {
	create: createApplicationPromise,
	getByKey: getByKey,
	configureIOS: configureIOS
};
