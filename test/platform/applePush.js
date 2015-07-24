/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var sinceToDate = require("../../sinceToDate"),
    should = require("should"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device"),
    buildMessage = require("../../controllers/buildNotification"),
    sinon = require("sinon"),
    mongoose = require("mongoose"),
    apn = require("apn"),
    Q = require("q"),
    fs = require("fs"),
    applePush = require("../../controllers/pushApple");

describe("applePush", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        ApplicationAndroidGCMKey = "ApplicationAndroidGCMKey",
        deviceToken = "abcdef1234567890",
        deviceAlias = "deviceAlias",
        iosPlatform = "ios";

    beforeEach(function (done) {
        this.pfx = fs.readFileSync("test/support/initializeTest.pfx");
        this.pfxBase64 = this.pfx.toString("base64");

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


    it("buildMessage", function (done) {
        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
            message = buildMessage(notification, "ios", "payload", apn.Notification).toJSON();

        should.not.exists(message["content-available"]);

        done();
    });

    it("simplePush", function (done) {
        var that = this;

        var connection = new apn.Connection(),
            feedback = applePush.createFeedbackService(this.pfx, "apntest", false),
            mockConnection = this.sinon.mock(connection),
            mockApn = this.sinon.mock(apn);

        mockApn.expects("Connection").once().returns(connection);
        mockApn.expects("Feedback").withArgs(sinon.match({gateway: "gateway.sandbox.push.apple.com", passphrase: "apntest"})).once().returns(feedback);

        mockConnection.expects("pushNotification").twice().withArgs(sinon.match({
            _contentAvailable: true,
            encoding: "utf8",
            expiry: 0,
            payload: { param1: "param1 value", param2: "param2 value" },
            priority: 10,
            retryLimit: -1
        }), sinon.match.any);

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                var certificates = {};

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest"};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "payload", apn.Notification);

                        applePush.push(application, device, message);
                        applePush.push(application, device, message);
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("simplePush (multi)", function (done) {
        var that = this;

        var connection = new apn.Connection(),
            feedback = applePush.createFeedbackService(this.pfx, "apntest", false),
            mockConnection = this.sinon.mock(connection),
            mockApn = this.sinon.mock(apn),
            certificate = "not default";

        mockApn.expects("Connection").once().returns(connection);
        mockApn.expects("Feedback").withArgs(sinon.match({gateway: "gateway.sandbox.push.apple.com", passphrase: "apntest"})).once().returns(feedback);

        mockConnection.expects("pushNotification").twice().withArgs(sinon.match({
            _contentAvailable: true,
            encoding: "utf8",
            expiry: 0,
            payload: { param1: "param1 value", param2: "param2 value" },
            priority: 10,
            retryLimit: -1
        }), sinon.match.any);

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                var certificates = {};

                certificates[certificate] = {pfx: that.pfx, passphrase: "apntest"};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null, certificate)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "payload", apn.Notification);

                        applePush.push(application, device, message);
                        applePush.push(application, device, message);
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("simplePush (multi certificate not found)", function (done) {
        var that = this;

        var connection = new apn.Connection(),
            mockConnection = this.sinon.mock(connection),
            mockApn = this.sinon.mock(apn),
            certificate = "not default",
            certificateNotFound = "not found";

        mockApn.expects("Connection").never();
        mockApn.expects("Feedback").never();

        mockConnection.expects("pushNotification").never();

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                var certificates = {};

                certificates[certificate] = {pfx: that.pfx, passphrase: "apntest"};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null, certificateNotFound)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "payload", apn.Notification);

                        applePush.push(application, device, message);
                        applePush.push(application, device, message);
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

});
