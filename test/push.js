/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    request = require("supertest"),
    Application = require("../controllers/application"),
    Device = require("../controllers/device"),
    app = require("../app");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        devicePlatform = "devicePlatform",
        deviceToken = "deviceToken";

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

    it("push notification to a device", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret, function(err, application) {
            should.not.exists(err);
            should.exists(application);

            Device.create(application, devicePlatform, deviceToken, null, function(err, device) {
                should.not.exists(err);
                should.exists(device);

                request(app)
                    .post("/api/push/")
                    .auth(applicationKey, applicationMasterSecret)
                    .send({audience: {device_token: device.token}})
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        done();
                    }
                );
            });
        });
    });
});
