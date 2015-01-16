/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ApplicationSchema = new Schema({
    name: { type: String, required: true, unique: true },
    secret_key_push: { type: String, required: true, unique: true },
    secret_key: { type: String, required: true, unique: true },
    access_key: { type: String, required: true, unique: true },
    development: Boolean,
    ios: {
        pfxData: Buffer,
        passphrase: String
    }
});

module.exports = mongoose.model('Application', ApplicationSchema);
