/*jslint node: true */
/*eslint-env node */
"use strict";
var kue = require('kue'),
    util = require("util"),
    logger = require("../logger");

var redisPort = process.env.REDIS_PORT || 6379,
    redisHost = process.env.REDIS_HOST;


if (process.env.REDIS_HOST) {
    var jobs = kue.createQueue({
        prefix: 'openurban_tasks',
        redis: {
            port: redisPort,
            host: redisHost
        }
    });

    if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "dev") {
        logger.info(util.format("redis connected %s:%s", redisHost, redisPort));

        kue.app.listen(3000);

        jobs.active(function (err, ids) {
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
    }
}

module.exports = {
    isSupported: !!process.env.REDIS_HOST,

    create: function(name, params) {
        if (!process.env.REDIS_HOST) {
            throw new Error("REDIS not configured for tasks");
        }

        return jobs.create(name, params);
    },
    process: function(name, n, callback) {
        if (!process.env.REDIS_HOST) {
            throw new Error("REDIS not configured for tasks");
        }

        jobs.process(name, n, callback);
    }
};
