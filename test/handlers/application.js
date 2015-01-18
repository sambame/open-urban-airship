/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    generalConfig = require("config").general,
    Application = require("../../controllers/application"),
    request = require("supertest"),
    app = require("../../app");

describe("application", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        passphrase = "thisIsAPassword",
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

    it("registers new application", function(done) {
        request(app)
            .post("/api/partner/companies/{companyId}/apps")
            .send({name: applicationName})
            .expect(200)
            .end(function (err, res) {
                should.not.exists(err);
                should.exist(res);

                done();
            });
    });

    it("list application", function(done) {
        request(app)
            .get("/api/partner/companies/{companyId}/apps")
            .auth(generalConfig.masterKey, generalConfig.masterSecret)
            .expect(200)
            .end(function (err, res) {
                should.not.exists(err);
                should.exist(res);

                done();
            });
    });

    it("attach ios data", function(done) {
        Application.create(applicationName, true, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.save();
            })
            .then(function() {
                request(app)
                    .put("/api/partner/companies/{companyId}/apps/services/ios")
                    .auth(applicationKey, applicationSecret)
                    .type('form')
                    .field("passphrase", "passphrase")
                    .attach("pfx", 'test/data/fake_pfx.not.p12')
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        done();
                    });
            })
            .catch(function(err) {
                should.not.exists(err);
            });
    });
});