/*jslint node: true */
/*eslint-env node */
"use strict";
var kue = require('kue'),
    util = require("util"),
    logger = require("../logger");

var redisPort = process.env.REDIS_PORT || 6379,
    redisHost = process.env.REDIS_HOST || "127.0.0.1";

logger.info(util.format("redis connected %s:%s", redisHost, redisPort));

var jobs = kue.createQueue({
    prefix: 'openurban_tasks',
    redis: {
        port: redisPort,
        host: redisHost
    }
});

kue.app.listen(3000);

jobs.active( function( err, ids ) {
    if (err) {
        logger.error(util.format("failed to active redis %s", err), err);
    }
    if (ids) {
        ids.forEach(function (id) {
            kue.Job.get(id, function (err, job) {
                job.inactive();
            });
        });
    }
});

module.exports = {
    create: function(name, params) {
        return jobs.create(name, params);
    },
    process: function(name, n, callback) {
        jobs.process(name, n, callback);
    }
};
