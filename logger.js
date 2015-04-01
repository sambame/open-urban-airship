/*jslint node: true */
/*eslint-env node */
"use strict";

var winston = require('winston');

var transports = [];

if (process.env.NODE_ENV !== "test") {
    transports.push(new (winston.transports.Console)({colorize: true, level: "verbose", timestamp: true, handleExceptions: process.env.NODE_ENV === "production"}));
}


var logger = new (winston.Logger)({
    transports: transports
});


logger.debug = logger.debug;
logger.info = logger.info;
logger.error = logger.error;
logger.warn = logger.warn;

module.exports = logger;