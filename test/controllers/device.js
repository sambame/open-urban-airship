/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    async = require("async"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        deviceToken = "deviceToken",
        veryLongDeviceToken = "AAAAAAA0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789aaaaaaaaa",
        deviceToken1 = "deviceToken1",
        deviceToken2 = "deviceToken2",
        deviceAlias = "deviceAlias",
        devicePlatform = "test";

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

    it("getAudience (token)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, deviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    Device.getByAudience(application, {device_token: deviceToken}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(1);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (token case insensitive)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, deviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    Device.getByAudience(application, {device_token: deviceToken.toLowerCase()}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(1);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (token case insensitive should not work)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, veryLongDeviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    veryLongDeviceToken.should.not.equal(veryLongDeviceToken.toLowerCase());
                    veryLongDeviceToken.should.not.equal(veryLongDeviceToken.toUpperCase());

                    Device.getByAudience(application, {device_token: veryLongDeviceToken.toLowerCase()}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(0);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (token long)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, veryLongDeviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    Device.getByAudience(application, {device_token: veryLongDeviceToken}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(1);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (apid)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, deviceToken, null, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    Device.getByAudience(application, {apid: device.apid}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(1);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (alias)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.create(application, devicePlatform, deviceToken, deviceAlias, null, function(err, device) {
                    should.not.exists(err);
                    should.exists(device);

                    Device.getByAudience(application, {alias: device.alias}, function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(1);

                        done();
                    });
                });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("getAudience (alias multi)", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                async.waterfall(
                    [
                        function(callback) {
                            Device.create(application, devicePlatform, deviceToken1, deviceAlias, null, function(err) {
                                callback(err);
                            });
                        },
                        function(callback) {
                            Device.create(application, devicePlatform, deviceToken2, deviceAlias, null, function(err) {
                                callback(err);
                            });
                        },
                        function(callback) {
                            Device.getByAudience(application, {alias: deviceAlias}, callback);
                        }
                    ],
                    function(err, devices) {
                        should.not.exists(err);
                        should.exists(devices);
                        devices.length.should.equal(2);

                        done();
                    }
                );
            })
            .catch(function(err) {
                should.not.exists(err);
                done(err);
            });
    });
});