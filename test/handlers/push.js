/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    request = require("supertest"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device"),
    minioc = require("minioc"),
    app = require("../../app");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        devicePlatform = "test",
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
        var pushSpy = this.sinon.spy();

        minioc.register("push-" + devicePlatform).as.value(
            {
                push: pushSpy
            }
        );

        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ();
            })
            .then(function(application) {
                Device.create(application, devicePlatform, deviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    request(app)
                        .post("/api/push/")
                        .auth(applicationKey, applicationMasterSecret)
                        .send({audience: {device_token: device.token}, notification: {alert: "test"}})
                        .expect(200)
                        .end(function (err, res) {
                            should.not.exists(err);
                            should.exist(res);
                            pushSpy.called.should.be.true;

                            done();
                        }
                    );
                });
            })
            .catch(function() {
                should.not.exists(err);
            });
    });
});
