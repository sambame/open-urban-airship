/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var sinceToDate = require("../../sinceToDate"),
    should = require("should"),
    Application = require("../../controllers/application"),
    Device = require("../../controllers/device"),
    minioc = require("minioc"),
    sinon = require("sinon"),
    gcm = require("node-gcm"),
    mongoose = require("mongoose"),
    Q = require("q"),
    buildMessage = require("../../controllers/buildNotification"),
    push = require("../../controllers/pushAndroid");



describe("androidPush", function() {
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
        var gcmSender = new gcm.Sender("token"),
            mockGCM = this.sinon.mock(gcmSender);

        minioc.register("gcm").as.value(mockGCM);

        mockGCM.expects("send").once().withArgs().callsArgWith(3, null, {});

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    .then(function(device) {
                        push.pushWithSender(gcmSender, application, device, {alert: "alert"});
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
               done(err);
            });
    });

    it("simplePush (failure)", function (done) {
        var gcmSender = new gcm.Sender("token"),
            mockGCM = this.sinon.mock(gcmSender);

        minioc.register("gcm").as.value(mockGCM);

        mockGCM.expects("send").once().withArgs().callsArgWith(3, null, {"multicast_id":1,"success":0,"failure":1,"canonical_ids":0,"results":[{"error":"NotRegistered"}]});

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    .then(function(device) {
                        return device.saveQ();
                    })
                    .then(function(device) {
                        return Q.nfcall(push.pushWithSender, gcmSender, application, device, {alert: "alert"});
                    })
                    .then(function(err, result) {
                        return Device.getByAudience(application, {alias: deviceAlias})
                    })
                    .then(function(devices) {
                        var device = devices[0];
                        device.active.should.be.false;
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    })

    it("simplePush (switched id)", function (done) {
        var gcmSender = new gcm.Sender("token"),
            new_registration_id = "new_registration_id",
            mockGCM = this.sinon.mock(gcmSender);

        minioc.register("gcm").as.value(mockGCM);


        var notification = {alert: "alert"},
            message = buildMessage(notification, "android", "data", gcm.Message);

        mockGCM.expects("send").once().withArgs(message, [deviceToken.toUpperCase()]).callsArgWith(3, null, {"multicast_id":1,"success":1,"failure":0,"canonical_ids":1,"results":[{"registration_id":new_registration_id,"message_id":"message_id"}]});
        mockGCM.expects("send").once().withArgs(message, [new_registration_id]).callsArgWith(3, null, {"multicast_id":1,"success":1,"failure":0,"canonical_ids":1,"results":[]});

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return Device.createOrUpdate(application, null, devicePlatform, deviceToken, deviceAlias)
                    .then(function(device) {
                        device.token.should.equal(deviceToken.toUpperCase());
                        return device.saveQ();
                    })
                    .then(function(device) {
                        return Q.nfcall(push.pushWithSender, gcmSender, application, device, notification);
                    })
                    .then(function() {
                        return Device.getByAudience(application, {alias: deviceAlias})
                    })
                    .then(function(devices) {
                        var device = devices[0];
                        device.token.should.equal(new_registration_id);
                    });
            })
            .then(function() {
                done();
            })
            .catch(function(err) {
                done(err);
            });
    })
});
