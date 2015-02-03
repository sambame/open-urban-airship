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
        deviceAlias = "deviceAlias",
        deviceToken = "deviceToken",
        deviceToken1 = "deviceToken1",
        deviceToken2 = "deviceToken2";

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

    it("push notification to a device (token)", function(done) {
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
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function(device) {
                        request(app)
                            .post("/api/push/")
                            .auth(applicationKey, applicationMasterSecret)
                            .send({audience: {device_token: device.token}, notification: {alert: "test"}})
                            .expect(200)
                            .end(function (err, res) {
                                should.exist(res);
                                pushSpy.called.should.be.true;

                                done(err);
                            }
                        );
                    })
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("push notification to a device (apid)", function(done) {
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
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function(device) {
                        request(app)
                            .post("/api/push/")
                            .auth(applicationKey, applicationMasterSecret)
                            .send({audience: {apid: device.apid}, notification: {alert: "test"}})
                            .expect(200)
                            .end(function (err, res) {
                                should.exist(res);
                                pushSpy.calledOnce.should.be.true;

                                done(err);
                            }
                        );
                    });
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("push notification to a device (alias)", function(done) {
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
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    .then(function(device) {
                        request(app)
                            .post("/api/push/")
                            .auth(applicationKey, applicationMasterSecret)
                            .send({audience: {alias: device.alias}, notification: {alert: "test"}})
                            .expect(200)
                            .end(function (err, res) {
                                should.exist(res);
                                pushSpy.calledOnce.should.be.true;

                                done(err);
                            }
                        );
                    });

            })
            .catch(function(err) {
                done(err);
            });
    });

    it("push notification to a device (apid multi)", function(done) {
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
            .then(function() {
                return Device.createOrUpdate(applicationKey, null, devicePlatform, deviceToken1, deviceAlias);
            })
            .then(function() {
                return Device.createOrUpdate(applicationKey, null, devicePlatform, deviceToken2, deviceAlias);
            }).
            then(function() {
                request(app)
                    .post("/api/push/")
                    .auth(applicationKey, applicationMasterSecret)
                    .send({audience: {alias: deviceAlias}, notification: {alert: "test"}})
                    .expect(200)
                    .end(function (err, res) {
                        should.exist(res);
                        pushSpy.calledTwice.should.be.true;

                        done(err);
                    }
                );
            })
            .catch(function(err) {
                done(err);
            });
    });

});
