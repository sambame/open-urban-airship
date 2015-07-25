/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require("mongoose-q")(require("mongoose")),
    _ = require("lodash"),
    iOSCertificateSchema = require("./iOSCertificate"),
    Schema = mongoose.Schema;

var ApplicationSchema = new Schema({
    _id: {type: String },
    name: { type: String, required: true },
    master_secret: { type: String, required: true, unique: true },
    secret: { type: String, required: true, unique: true },
    ios: {
        pfxData: Buffer,
        passphrase: String,
        pushExpirationDate: Date,
        production: Boolean,
        sandbox: Boolean
    },
    ios_certificates: [iOSCertificateSchema.schema],
    android: {
        gcm_api_key: String
    },
    key: {type: String, get: function() {return this._id;}},
    old_key: {type: String}
});


var ApplicationModel = mongoose.model('Application', ApplicationSchema);

/**
 *
 * @param {String} name
 * @returns {Number}
 */
ApplicationModel.prototype.indexOfCertificate = function(name) {
    if (!name) {
        return -1;
    }

    name = name.toLocaleString();

    return _.findIndex((this.ios_certificates || []), function(certificate) {
        return certificate.name.toLowerCase() === name;
    });
};

module.exports = ApplicationModel;
