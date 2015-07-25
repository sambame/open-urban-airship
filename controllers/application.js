/*jslint node: true */
/*eslint-env node */
"use strict";
var ApplicationModel = require("../models/application"),
    iOSCertificateModel = require("../models/iOSCertificate"),
	_ = require("lodash"),
	promisify = require("../promisify");

/**
 *
 * @param {string} name
 * @param {string} key
 * @param {string} master_secret
 * @param {string} secret
 * @param {function} callback
 */
var createApplication = function(name, key, master_secret, secret, callback) {
	var application = new ApplicationModel();
	application.name = name;

	application.master_secret = master_secret;
	application.secret = secret;
	application._id = key;

	callback(null, application);
};

var createApplicationQ = function(name, key, master_secret, secret) {
	var p = promisify(createApplication);

	return p(name, key, master_secret, secret);
};

/**
 *
 * @param {ApplicationModel} application
 * @param {Object} certificates
 */
var configureIOS = function(application, certificates) {
    _.forOwn(certificates, function(val, name) {
        name = name.toLocaleLowerCase();

        if (name === "default") {
            application.ios.pfxData = val.pfx;
            application.ios.passphrase = val.passphrase;
            application.ios.production = val.production;
            application.ios.sandbox = val.sandbox;
            application.ios.pushExpirationDate = val.pushExpirationDate;
        } else {
            var indexOfPrevCertificate = application.indexOfCertificate(name),
                newCertificate = new iOSCertificateModel();

            newCertificate.production = val.production;
            newCertificate.sandbox = val.sandbox;
            newCertificate.pushExpirationDate = val.pushExpirationDate;
            newCertificate.pfxData = val.pfx;
            newCertificate.passphrase = val.passphrase;
            newCertificate.name = name;

            if (indexOfPrevCertificate === -1) {
                application.ios_certificates.push(newCertificate);
            } else {
                if (_.isUndefined(val.pfx)) {
                    application.ios_certificates.splice(indexOfPrevCertificate, 1);
                } else {
                    application.ios_certificates[indexOfPrevCertificate] = newCertificate;
                }
            }
        }
    });
};

var getByKey = function(applicationKey) {
	return ApplicationModel.findOneQ({_id: applicationKey})
};

module.exports = {
	create: createApplicationQ,
	getByKey: getByKey,
	configureIOS: configureIOS
};
