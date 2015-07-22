/*jslint node: true */
/*eslint-env node */
"use strict";

var mongoose = require("mongoose-q")(require("mongoose")),
    Schema = mongoose.Schema,
    logger = require("../logger"),
    util = require("util"),
    uuid = require("node-uuid");

var iosTokenLength = 64,
    apidTokenLength = 36,
    DeviceSchema = new Schema({
        _id: {type: String, default: uuid},
        token: { type: String, required: true },
        alias: { type: String },
        platform: { type: String, required: true, enum: ["ios", "android", "test"]},
        _application: { type: String, ref: "Application", required: true },
        active: {type: Boolean, "default": true},
        last_deactivation_date: Date,
        tags: [String],
        apid: {type: String, get: function() {return this._id;}},
        "created_at": {type: Date},
        "updated_at": {type: Date},
        old_key: {type: String},
        "ios_certificate_name": {type: String}
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

function deactivateByConditions(application, conditions, time) {
    conditions._application = application._id;

    var updateParams = {$set: {active: false, last_deactivation_date: time || new Date()}};

    return DeviceModel.findOneAndUpdateQ(conditions, updateParams, {multiple: false, upsert: false, new: true})
        .then(function(device) {
            if (!device) {
                logger.warn("got deactivate on unknown device", conditions);
                return;
            }

            logger.info(util.format("device %s (%s) is no longer active", device.alias || device.token, device.platform));

            return device;
        });
}

var isGCMToken = function(token) {
    if (!token) {
        return false;
    }

    return token.length > iosTokenLength;
};

var isCaseInsensitiveToken = function(token) {
    if (!token) {
        return false;
    }

    return token.length <= iosTokenLength;
};

DeviceSchema.statics.isCaseInsensitiveToken = isCaseInsensitiveToken;
DeviceSchema.statics.isGCMToken = isGCMToken;

DeviceSchema.statics.deactivateByAPID = function(application, apid, time) {
    return deactivateByConditions(application, {_id: apid}, time);
};

DeviceSchema.statics.deactivateByToken = function(application, token, time) {
    if (token && isCaseInsensitiveToken(token)) {
        token = token.toUpperCase();
    }

    return deactivateByConditions(application, {token: token}, time);
};


var DeviceModel = mongoose.model("Device", DeviceSchema);
module.exports = DeviceModel;
