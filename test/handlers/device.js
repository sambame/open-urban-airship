/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    request = require("supertest"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device"),
    app = require("../../app");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        deviceToken = "deviceToken",
        deviceAlias = "deviceAlias",
        devicePlatform = "test",
        deviceToken2 = "deviceToken2",
        deviceToken3 = "deviceToken3";

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

    it("registers new device", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.save();
            })
            .then(function() {
                request(app)
                    .put("/api/device_tokens/" + deviceToken)
                    .auth(applicationKey, applicationSecret)
                    .send({platform: 'test'})
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        done();
                    });
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("delete device (token)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ()
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    })
                    .then(function(device) {
                        request(app)
                            .delete("/api/device_tokens/" + device)
                            .auth(applicationKey, applicationSecret)
                            .send({platform: 'test'})
                            .expect(204)
                            .end(function(err, res) {
                                should.not.exists(err);
                                should.exist(res);

                                done();
                            });
                    })
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("delete device (apid)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ()
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    })
                    .then(function(device) {
                        request(app)
                            .delete("/api/apids/" + device.apid)
                            .auth(applicationKey, applicationSecret)
                            .send({platform: 'test'})
                            .expect(204)
                            .end(function(err, res) {
                                should.not.exists(err);
                                should.exist(res);

                                done();
                            });
                    })
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("update device (by apid)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ()
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    })
                    .then(function(device) {
                        request(app)
                            .put("/api/apids/" + device.apid)
                            .auth(applicationKey, applicationSecret)
                            .send({alias: deviceAlias})
                            .expect(200)
                            .end(function(err, res) {
                                should.not.exists(err);
                                should.exist(res);

                                done();
                            });
                    })
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("update device (by token)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ()
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    })
                    .then(function(device) {
                        request(app)
                            .put("/api/device_tokens/" + device.token)
                            .auth(applicationKey, applicationSecret)
                            .send({alias: deviceAlias})
                            .expect(200)
                            .end(function(err, res) {
                                should.not.exists(err);
                                should.exist(res);

                                done();
                            });
                    })
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("list devices", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.save();
            })
            .then(function() {
                request(app)
                    .get("/api/device_tokens/")
                    .auth(applicationKey, applicationMasterSecret)
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        done();
                    });
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("feedback devices", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ()
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    })
                    .then(function(device) {
                        Device.deactivate(application, device.apid);
                    })
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken2)
                    })
                    .then(function(device) {
                        return Device.deactivate(application, device.apid);
                    })
                    .then(function() {
                        return Device.createOrUpdate(application, null, devicePlatform, deviceToken3)
                    });
            })
            .then(function() {
                request(app)
                    .get("/api/device_tokens/feedback/?since=0")
                    .auth(applicationKey, applicationMasterSecret)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.exist(res);

                        var j = JSON.parse(res.text);

                        j.length.should.equal(2);

                        done();
                    });
            })
            .catch(function(err) {
                done(err);
            });
    });

});