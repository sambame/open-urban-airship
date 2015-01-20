/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose-q')(),
    Schema = mongoose.Schema;

var ApplicationSchema = new Schema({
    name: { type: String, required: true },
    master_secret: { type: String, required: true, unique: true },
    secret: { type: String, required: true, unique: true },
    key: { type: String, required: true, unique: true },
    production: Boolean,
    ios: {
        pfxData: Buffer,
        passphrase: String
    },
    android: {
        gcm_api_key: String,
        android_package_name: String
    }
});

module.exports = mongoose.model('Application', ApplicationSchema);
