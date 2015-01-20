/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    uuid = require('node-uuid');

var DeviceSchema = new Schema({
    token: { type: String, required: true },
    alias: { type: String },
    platform: { type: String, required: true, enum: ["ios", "android", "test"]},
    _application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
	status: {type: String, 'default': 'active', required: true},
    apid: { type: String, default: uuid }
});

DeviceSchema.index({_application: 1, token: 1}, {unique: true});
DeviceSchema.index({_application: 1, alias: 1}, {unique: false});

module.exports = mongoose.model('Device', DeviceSchema);
