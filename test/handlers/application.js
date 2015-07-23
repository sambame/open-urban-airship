/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    fs = require("fs"),
    generalConfig = require("config").general,
    Application = require("../../controllers/application"),
    request = require("supertest"),
    Q = require("q"),
    app = require("../../app");

describe("application", function() {
    var applicationName = "applicationName",
        applicationKey = "applicationKey",
        applicationSecret = "applicationSecret",
        applicationMasterSecret = "applicationMasterSecret",
        ApplicationAndroidGCMKey = "ApplicationAndroidGCMKey",
        deviceToken = "deviceToken";

    beforeEach(function (done) {
        this.sinon = sinon.sandbox.create();

        this.pfx = fs.readFileSync("test/support/initializeTest.pfx");
        this.pfxBase64 = this.pfx.toString("base64");

        this.cert = fs.readFileSync("test/support/initializeTest.crt");
        this.key = fs.readFileSync("test/support/initializeTest.key");

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

    it("health check", function(done) {
        request(app)
            .get("/api/health-check")
            .expect(200)
            .end(function (err, res) {
                should.not.exists(err);
                should.exist(res);

                done();
            });
    });

    it("registers new application (ios certificate)", function(done) {
        var that = this;

        request(app)
            .post("/api/partner/companies/{companyId}/apps")
            .send({
                ios_certificate: that.pfxBase64,
                ios_certificate_password: "apntest",
                name: applicationName
            })
            .expect(200)
            .end(function (err, res) {
                should.not.exists(err);
                should.exist(res);

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

    it("update application", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ();
            })
            .then(function(application) {
                var deferred = Q.defer();

                request(app)
                    .post("/api/partner/companies/{companyId}/app")
                    .auth(application.key, application.secret)
                    .send({gcm_api_key: ApplicationAndroidGCMKey})
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .then(function() {
                return Application.getByKey(applicationKey);
            })
            .then(function(application) {
                should.exist(application.android);
                should.exist(application.android.gcm_api_key);
                application.android.gcm_api_key.should.equal(ApplicationAndroidGCMKey);
            })
            .then(done)
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("update application (ios certificate)", function(done) {
        var that = this;

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ();
            })
            .then(function(application) {
                var deferred = Q.defer();

                request(app)
                    .post("/api/partner/companies/{companyId}/app")
                    .auth(application.key, application.secret)
                    .send({
                        ios_certificate: that.pfxBase64,
                        ios_certificate_password: "apntest"
                    })
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .then(done)
            .catch(function(err) {
                should.not.exists(err);
            });
    });

    it("update application (multi ios certificate)", function(done) {
        var that = this;

        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
            .then(function(application) {
                return application.saveQ();
            })
            .then(function(application) {
                var deferred = Q.defer();

                request(app)
                    .post("/api/partner/companies/{companyId}/app")
                    .auth(application.key, application.secret)
                    .send({
                        ios_certificates: {
                            "not default": {
                                pfx: that.pfxBase64,
                                passphrase: "apntest"
                            }
                        }
                    })
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exists(err);
                        should.exist(res);

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .then(done)
            .catch(function(err) {
                should.not.exists(err);
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

    it("attach ios data (invalid pfx)", function(done) {
        Application.create(applicationName, applicationKey, applicationMasterSecret, applicationSecret)
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
                    .expect(400)
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