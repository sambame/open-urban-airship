/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var sinceToDate = require("../../sinceToDate"),
    should = require("should"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device"),
    buildMessage = require("../../controllers/buildNotification"),
    minioc = require("minioc"),
    sinon = require("sinon"),
    gcm = require("node-gcm"),
    mongoose = require("mongoose"),
    apn = require("apn"),
    Q = require("q"),
    push = require("../../controllers/pushApple");

describe("applePush", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        devicePlatform = "test",
        deviceAlias = "deviceAlias",
        ApplicationAndroidGCMKey = "ApplicationAndroidGCMKey",
        deviceToken = "deviceToken";

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


    it("simplePush", function (done) {
        var notification = {"ios":{"content-available":1,"extra":{"param1": "param1 value","param2":"param2 value"}}},
            message = push.postProcessMessage(buildMessage(notification, "ios", "payload", apn.Notification)).toJSON();

        message.aps["content-available"].should.equal(1);

        done()
    })
});
