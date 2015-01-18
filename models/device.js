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

DeviceSchema.index({token: 1,  _application: 1}, {unique: true});
DeviceSchema.index({alias: 1,  _application: 1}, {unique: true});

module.exports = mongoose.model('Device', DeviceSchema);
