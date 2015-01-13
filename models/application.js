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
    ios_certificate: {
        push_certificate: String,
        push_certificate_filename: String,

        push_key: String,
        push_key_filename: String
    }
});

module.exports = mongoose.model('Application', ApplicationSchema);
