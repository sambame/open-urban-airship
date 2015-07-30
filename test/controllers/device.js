/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    Application = require("../../controllers/application"),
    Q = require('q'),
    Device = require("../../controllers/device"),
    DeviceModel = require("../../models/device");


describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        deviceToken = "deviceToken",


        applicationName2 = "applicationName2",
        applicationKey2 = "applicationKey2",
        applicationSecret2 = "applicationSecret2",
        applicationMasterSecret2 = "applicationMasterSecret2",

        veryLongDeviceToken = "lahxy2rm7sc:APA91bherovusah_qewtemucvcuhnoj3q145ftuycyumjbeemk6u-9qrxcehcaxivdrq665vbpunjihpbjrynamrwnjheqq5vephya8dyjkbmkutnhr7cygt1tmsoqvxliyzkzuk5u-e",
        deviceToken1 = "deviceToken1",
        deviceToken2 = "deviceToken2",
        deviceAlias = "deviceAlias",
        devicePlatform = "test";

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

    describe("multi certificate", function() {
        var certificate1 = "not default",
            pfxBuffer1 = "pfxBuffer1",
            certificate1Passpharse = "certificate1Passpharse";

        it("device from multi certificate", function(done) {
            Application.create(applicationName2, applicationKey2, applicationMasterSecret2, applicationSecret2)
                .then(function(application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};

                    Application.configureIOS(application, certificates);

                    return application;
                })
                .then(function(application) {
                    return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias, null, certificate1);
                })
                .then(function(device) {
                    should.exists(device.ios.ios_certificate_name);
                    device.ios.ios_certificate_name.should.equal(certificate1);
                })
                .then(done)
                .catch(function(err) {
                    done(err);
                });
        });
    });

    it("getAudience two apps same alias", function(done) {
        Q.all(
            [
                Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret),
                Application.create(applicationName2, applicationKey2, applicationMasterSecret2, applicationSecret2)
            ])
            .then(function(applications) {
                return Device.createOrUpdate(applications[0], null, devicePlatform, deviceToken, deviceAlias)
                    .then(function() {
                        return Device.createOrUpdate(applications[1], null, devicePlatform, deviceToken2, deviceAlias);
                    })
                    .then(function() {
                        return Device.getByAudience(applications[0], {alias: deviceAlias})
                    })
                    .then(function(devices) {
                        should.exists(devices);
                        devices.length.should.equal(1);
                        devices[0].token.should.equal(deviceToken.toUpperCase());
                    })
                    .then(function() {
                        return Device.getByAudience(applications[1], {alias: deviceAlias});
                    })
                    .then(function(devices) {
                        should.exists(devices);
                        devices.length.should.equal(1);
                        devices[0].token.should.equal(deviceToken2.toUpperCase());
                    });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (token)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function() {
                        return Device.getByAudience(application, {device_token: deviceToken})
                            .then(function(devices) {
                                devices.length.should.equal(1);
                            })
                        });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (token case insensitive)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function() {
                        return Device.getByAudience(application, {device_token: deviceToken.toLowerCase()});
                    })
                    .then(function(devices) {
                        devices.length.should.equal(1);
                    })
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (token case insensitive should not work)", function(done) {
        veryLongDeviceToken.should.not.equal(veryLongDeviceToken.toLowerCase());
        veryLongDeviceToken.should.not.equal(veryLongDeviceToken.toUpperCase());

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.createOrUpdate(application, null, devicePlatform, veryLongDeviceToken)
                    .then(function() {
                        return Device.getByAudience(application, {device_token: veryLongDeviceToken.toLowerCase()});
                    })
                    .then(function(devices) {
                        devices.length.should.equal(0);
                    });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (token long)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.createOrUpdate(application, null, devicePlatform, veryLongDeviceToken)
                    .then(function() {
                        return Device.getByAudience(application, {device_token: veryLongDeviceToken});
                    })
                    .then(function(devices) {
                        devices.length.should.equal(1);
                    });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (apid)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function(device) {
                        return Device.getByAudience(application, {apid: device.apid});
                    })
                    .then(function(devices) {
                        devices.length.should.equal(1);
                    });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (alias)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    .then(function(device) {
                        return Device.getByAudience(application, {alias: device.alias})
                    })
                    .then(function(devices) {
                        devices.length.should.equal(1);
                    });
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("getAudience (alias multi)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Q.all(
                    [
                        Device.createOrUpdate(application, null, devicePlatform, deviceToken1, deviceAlias),
                        Device.createOrUpdate(application, null, devicePlatform, deviceToken2, deviceAlias)
                    ])
                    .then(function () {
                        return application;
                    })
            })
            .then(function(application) {
                return Device.getByAudience(application, {alias: deviceAlias});
            })
            .then(function(devices) {
                devices.length.should.equal(2);
            })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("delete (token)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function (device) {
                        return Device.getByAudience(application, {device_token: deviceToken})
                            .then(function (devices) {
                                devices.length.should.equal(1);
                                devices[0].active.should.be.true;
                            })
                            .then(function () {
                                return Device.deactivate(application, null, device.token)
                            })
                            .then(function () {
                                Device.getByAudience(application, {device_token: deviceToken})
                                    .then(function (devices) {
                                        devices.length.should.equal(1);
                                        devices[0].active.should.be.false;
                                    })
                            });
                    })
                })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

    it("delete (apid)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken)
                    .then(function (device) {
                        return Device.getByAudience(application, {apid: device.apid})
                            .then(function (devices) {
                                devices.length.should.equal(1);
                                devices[0].active.should.be.true;
                            })
                            .then(function () {
                                return Device.deactivate(application, device.apid)
                            })
                            .then(function () {
                                Device.getByAudience(application, {apid: device.apid})
                                    .then(function (devices) {
                                        devices.length.should.equal(1);
                                        devices[0].active.should.be.false;
                                    })
                            });
                    })
            })
            .then(done)
            .catch(function(err) {
                done(err);
            });
    });

});