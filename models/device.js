/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    uuid = require('node-uuid');

var DeviceSchema = new Schema({
    _id: {type: String, default: uuid},
    token: { type: String, required: true },
    alias: { type: String },
    platform: { type: String, required: true, enum: ["ios", "android", "test"]},
    _application: { type: String, ref: 'Application', required: true },
	active: {type: Boolean, 'default': true},
    tags: [String],
    apid: {type: String, get: function() {return this._id;}},
    "created_at": {type: Date},
    "updated_at": {type: Date},
    old_key: {type: String}
});

DeviceSchema.pre("save", function(next){
    var currentTime = new Date();

    if ( !this.created_at ) {
        this.created_at = currentTime;
    }

    this.updated_at = currentTime;

    next();
});


DeviceSchema.index({_application: 1, token: 1}, {unique: true});
DeviceSchema.index({_application: 1, alias: 1}, {unique: false});

module.exports = mongoose.model('Device', DeviceSchema);
