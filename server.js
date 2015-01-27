/*jslint node: true */
/*eslint-env node */
"use strict";

var app = require("./app"),
    logger = require("./logger");

var port = process.env.PORT || 5000;

app.listen(port, function () {
    logger.info("Listening on " +  port);
});
