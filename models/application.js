/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose-q')(),
    Schema = mongoose.Schema;

var ApplicationSchema = new Schema({
    _id: {type: String },
    name: { type: String, required: true },
    master_secret: { type: String, required: true, unique: true },
    secret: { type: String, required: true, unique: true },
    production: Boolean,
    ios: {
        pfxData: Buffer,
        passphrase: String,
        pushExpirationDate: Date
    },
    android: {
        gcm_api_key: String,
        android_package_name: String
    },
    key: {type: String, get: function() {return this._id;}},
    old_key: {type: String}
});

module.exports = mongoose.model('Application', ApplicationSchema);
