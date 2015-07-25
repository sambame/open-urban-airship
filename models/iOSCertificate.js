/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require("mongoose-q")(require("mongoose")),
    _ = require("lodash"),
    Schema = mongoose.Schema;

var iOSCertificateSchema = new Schema({
    name: String,
    pfxData: Buffer,
    passphrase: String,
    pushExpirationDate: Date,
    production: Boolean,
    sandbox: Boolean
});

var iOSCertificateModel = mongoose.model('iOSCertificate', iOSCertificateSchema);

module.exports = iOSCertificateModel;