/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    request = require("supertest"),
    Application = require("../../controllers/application"),
    app = require("../../app");

describe("device", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
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

    it("registers new device", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret, function(err, application) {
            should.not.exists(err);
            should.exists(application);

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
        });
    });

    it("list devices", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret, function(err, application) {
            should.not.exists(err);
            should.exists(application);

            request(app)
                .get("/api/device_tokens/")
                .auth(applicationKey, applicationMasterSecret)
                .expect(200)
                .end(function(err, res) {
                    should.not.exists(err);
                    should.exist(res);

                    done();
                });
        });
    });
});