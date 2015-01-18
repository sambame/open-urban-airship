/*jslint node: true */
/*eslint-env node */
"use strict";

var winston = require('winston');
  
 var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)()
    ]
  });


logger.verbose = logger.verbose;
logger.info = logger.info;
logger.error = logger.error;
logger.warn = logger.warn;

module.exports = logger;