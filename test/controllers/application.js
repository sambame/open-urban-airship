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


describe("application", function() {
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
        it("default", function (done) {
            var certificate1 = "default",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};

                    should.not.exists(application.ios.pfxData);
                    should.not.exists(application.ios.passphrase);

                    Application.configureIOS(application, certificates);

                    should.exists(application.ios.pfxData);
                    should.exists(application.ios.passphrase);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

        it("not default", function (done) {
            var certificate1 = "not default",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};

                    should.not.exists(application.ios.pfxData);
                    should.not.exists(application.ios.passphrase);

                    Application.configureIOS(application, certificates);

                    should.not.exists(application.ios.pfxData);
                    should.not.exists(application.ios.passphrase);

                    application.ios_certificates.length.should.equal(1);
                    application.ios_certificates[0].name.should.equal(certificate1);
                    application.ios_certificates[0].passphrase.should.equal(certificate1Passpharse);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

        it("not default and not", function (done) {
            var certificate1 = "default",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse",
                certificate2 = "not default",
                pfxBuffer2 = "pfxBuffer2",
                certificate2Passpharse = "certificate2Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};
                    certificates[certificate2] = {pfx: new Buffer(pfxBuffer2), passphrase: certificate2Passpharse};

                    should.not.exists(application.ios.pfxData);
                    should.not.exists(application.ios.passphrase);

                    Application.configureIOS(application, certificates);

                    should.exists(application.ios.pfxData);
                    should.exists(application.ios.passphrase);

                    application.ios_certificates.length.should.equal(1);
                    application.ios_certificates[0].name.should.equal(certificate2);
                    application.ios_certificates[0].passphrase.should.equal(certificate2Passpharse);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

        it("two non default", function (done) {
            var certificate1 = "not default1",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse",
                certificate2 = "not default2",
                pfxBuffer2 = "pfxBuffer2",
                certificate2Passpharse = "certificate2Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};
                    certificates[certificate2] = {pfx: new Buffer(pfxBuffer2), passphrase: certificate2Passpharse};

                    Application.configureIOS(application, certificates);

                    should.not.exists(application.ios.pfxData);
                    should.not.exists(application.ios.passphrase);

                    application.ios_certificates.length.should.equal(2);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

        it("remove existing", function (done) {
            var certificate1 = "not default1",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse",
                certificate2 = "not default2",
                pfxBuffer2 = "pfxBuffer2",
                certificate2Passpharse = "certificate2Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};
                    certificates[certificate2] = {pfx: new Buffer(pfxBuffer2), passphrase: certificate2Passpharse};

                    Application.configureIOS(application, certificates);

                    certificates = {};
                    certificates[certificate1] = {};
                    Application.configureIOS(application, certificates);

                    application.ios_certificates.length.should.equal(1);
                    application.ios_certificates[0].name.should.equal(certificate2);
                    application.ios_certificates[0].passphrase.should.equal(certificate2Passpharse);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

        it("update existing", function (done) {
            var certificate1 = "not default1",
                pfxBuffer1 = "pfxBuffer1",
                certificate1Passpharse = "certificate1Passpharse",
                certificate2 = "not default2",
                pfxBuffer2 = "pfxBuffer2",
                certificate2Passpharse = "certificate2Passpharse",
                certificate3Passpharse = "certificate3Passpharse";

            Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
                .then(function (application) {
                    var certificates = {};

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate1Passpharse};
                    certificates[certificate2] = {pfx: new Buffer(pfxBuffer2), passphrase: certificate2Passpharse};

                    Application.configureIOS(application, certificates);

                    certificates[certificate1] = {pfx: new Buffer(pfxBuffer1), passphrase: certificate3Passpharse};
                    Application.configureIOS(application, certificates);

                    application.ios_certificates.length.should.equal(2);
                })
                .then(done)
                .catch(function (err) {
                    done(err);
                });
        });

    });
});