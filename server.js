/*jslint node: true */
/*eslint-env node */
"use strict";

var app = require("./app"),
    mongoose = require("mongoose"),
    logger = require("./logger");

var port = process.env.PORT || 5000,
    mongoUri = process.env.MONGOLAB_URI || process.argv[2] || "mongodb://localhost/openurban";

mongoose.connect(mongoUri);

logger.info("mongodb: " + mongoUri);

app.listen(port, function () {
    logger.info("Listening on " +  port);
});
