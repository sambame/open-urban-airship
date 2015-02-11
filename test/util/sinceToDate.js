/*jslint node: true */
/*eslint-env node, mocha */
"use strict";

var sinceToDate = require("../../sinceToDate"),
    should = require("should");


describe("sinceToDate", function() {

    it("check iso8601", function(done) {
        var d1 = Date.parse("2001-01-01 10:12:13"),
            d2 = sinceToDate("2001-01-01T10:12:13").getTime();

        d1.should.equal(d2);
        done();
    });

    it("check iso8601 (no T)", function(done) {
        var d1 = Date.parse("2001-01-01 10:12:13"),
            d2 = sinceToDate("2001-01-01 10:12:13").getTime();

        d1.should.equal(d2);
        done();
    })

    it("check epco", function(done) {
        var d1 = Date.parse("2001-01-01 10:12:13"),
            d2 = sinceToDate(d1).getTime();

        d1.should.equal(d2);
        done();
    });

});

