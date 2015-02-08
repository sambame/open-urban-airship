/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    Application = require("../../controllers/application"),
    pushApple = require("../../controllers/pushApple"),
    apn = require("apn"),
    Device = require("../../controllers/device");

describe("apn Feedback", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        deviceToken = "deviceToken",
        deviceToken1 = "deviceToken1",
        deviceToken2 = "deviceToken2",
        deviceAlias = "deviceAlias";

    beforeEach(function (done) {
        this.sinon = sinon.sandbox.create();

        mongoose.connection.once("open", function () {
            mongoose.connection.db.dropDatabase(done);
        });

        mongoose.connect("mongodb://localhost/test_urban");
    });

    afterEach(function (done) {
        var that = this;

        mongoose.connection.once("close", function () {
            that.sinon.verify();
            that.sinon.restore();

            done();
        });

        mongoose.disconnect();
    });

    it("test simple Feedback", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, "ios", "af4c5dc2aa94184b6ec953f43ad9374eb675019ac18a09cbe2f136ae0bc9")
                    .then(function(device) {
                        should.not.exist(device.last_deactivation_date);
                        var apnDevice = new apn.Device("af4c5dc2aa94184b6ec953f43ad9374eb675019ac18a09cbe2f136ae0bc9");
                        return pushApple.deactivateDevice(application, apnDevice, 1422327083);
                    })
                    .then(function(device) {
                        should.exist(device);
                        should.exist(device.last_deactivation_date);
                    });
            })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });
});