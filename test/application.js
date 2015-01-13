/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var mongoose = require("mongoose"),
    should = require("should"),
    sinon = require("sinon"),
    generalConfig = require("config").general,
    request = require("supertest"),
    app = require("../app");

describe("application", function() {
    var applicationName = "applicationName";

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
            .put("/api/application/")
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
            .get("/api/application/")
            .auth(generalConfig.masterKey, generalConfig.masterSecret)
            .expect(200)
            .end(function (err, res) {
                should.not.exists(err);
                should.exist(res);

                done();
            });
    });
});