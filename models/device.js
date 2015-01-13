/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DeviceSchema = new Schema({
    token: { type: String, required: true, unique: true },
    alias: { type: String, unique: true },
    platform: { type: String, required: true},
    _application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
	status: {type: String, 'default': 'active', required: true}
});

DeviceSchema.index({token: 1, alias: 1, _application: 1}, {unique: true});

module.exports = mongoose.model('Device', DeviceSchema);