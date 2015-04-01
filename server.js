/*jslint node: true */
/*eslint-env node */
"use strict";

var app = require("./app"),
    mongoose = require("mongoose"),
    util = require("util"),
    logger = require("./logger");

var port = process.env.PORT || 5000,
    mongoUri = process.env.MONGOLAB_URI || process.argv[2] || "mongodb://localhost/openurban";

mongoose.connect(mongoUri);

mongoose.connection.on("connected", function () {
    logger.info("Mongoose default connection open to " + mongoUri);
});

mongoose.connection.on("error",function (err) {
    logger.error(util.format("Mongoose default connection error: %s", err), err);
});

mongoose.connection.on("disconnected", function () {
    logger.info("Mongoose default connection disconnected");
});

// If the Node process ends, close the Mongoose connection
process.on("SIGINT", function() {
    mongoose.connection.close(function () {
        logger.info("Mongoose default connection disconnected through app termination");
        process.exit(0);
    });
});

logger.info("mongodb connecting to" + mongoUri);

app.listen(port, function () {
    logger.info("Listening on " +  port);
});
