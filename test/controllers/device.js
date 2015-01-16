/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    request = require("supertest"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        deviceToken = "deviceToken",
        devicePlatform = "devicePlatform";

    beforeEach(function (done) {
        this.sinon = sinon.sandbox.create();

        mongoose.connect("mongodb://localhost/test_urban");
        mongoose.connection.once("open", function () {
            mongoose.connection.db.dropDatabase(done);
        });
    });

    afterEach(function (done) {
        var that = this;

        mongoose.disconnect(function () {
            that.sinon.verify();
            that.sinon.restore();

            done();
        });
    });

    it("getAudience", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret, function(err, application) {
            should.not.exists(err);
            should.exists(application);

            Device.create(application, devicePlatform, deviceToken, null, function(err, device) {
                should.not.exists(err);
                should.exists(device);

                Device.getByAudience(application, {deviceToken: deviceToken}, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    done();
                });
            });
        });
    });

});