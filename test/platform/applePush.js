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
    fs = require("fs"),
    util = require("util"),
    EventEmitter = require("events").EventEmitter,
    applePush = require("../../controllers/pushApple");

var apnConnection = function() {
    this.pushNotification = function() {};
    EventEmitter.call(this);
};

util.inherits(apnConnection, EventEmitter);

var apnFeedback = function() {

    EventEmitter.call(this);
};

util.inherits(apnFeedback, EventEmitter);

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

            applePush.clearConnections();
            applePush.clearFeedbacks();

            done();
        });

        mongoose.disconnect();
    });


    it("buildMessage", function (done) {
        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification).toJSON();

        should.not.exists(message["content-available"]);

        done();
    });

    it("simplePush", function (done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(feedback);

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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: false, sandbox: true};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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

    it("simplePush (productionHint: false)", function (done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(feedback);

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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: true, sandbox: true};
                Application.configureIOS(application, certificates);

                var sandbox = true;
                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null, null, sandbox)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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

    it("simplePush (productionHint: true)", function (done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(feedback);

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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: true, sandbox: true};
                Application.configureIOS(application, certificates);

                var sandbox = false;
                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null, null, sandbox)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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

    it("simplePush (prod)", function (done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(feedback);

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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: true, sandbox: false};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection),
            certificate = "not default";

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(feedback);

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

                certificates[certificate] = {pfx: that.pfx, passphrase: "apntest", production: false, sandbox: true};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null, certificate)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

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

    it("feedback", function(done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.sandbox.push.apple.com",
            passphrase: "apntest",
            production: false
        })).once().returns(feedback);

        mockConnection.expects("pushNotification").once().withArgs(sinon.match({
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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: false, sandbox: true};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

                        applePush.push(application, device, message);
                    });
            })
            .then(function() {
                feedback.emit("feedback", null, null);
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

    it("feedback (prod)", function(done) {
        var that = this;

        var mockApn = this.sinon.mock(apn),
            feedback = new apnFeedback(),
            connection = new apnConnection(),
            mockConnection = this.sinon.mock(connection);

        mockApn.expects("Connection").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(connection);

        mockApn.expects("Feedback").withArgs(sinon.match({
            gateway: "gateway.push.apple.com",
            passphrase: "apntest",
            production: true
        })).once().returns(feedback);

        mockConnection.expects("pushNotification").once().withArgs(sinon.match({
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

                certificates["default"] = {pfx: that.pfx, passphrase: "apntest", production: true, sandbox: false};
                Application.configureIOS(application, certificates);

                return Device.createOrUpdate(application, null, iosPlatform, deviceToken, deviceAlias, null)
                    .then(function(device) {
                        var notification = {"ios":{"content-available": 1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
                            message = buildMessage(notification, "ios", "ios", "payload", apn.Notification);

                        applePush.push(application, device, message);
                    });
            })
            .then(function() {
                feedback.emit("feedback", []);
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });
});
