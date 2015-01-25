/*jslint node: true */
/*eslint-env node */
"use strict";
var kue = require('kue');

var jobs = kue.createQueue({
    prefix: 'openurban_tasks',
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || "127.0.0.1"
    }
});

kue.app.listen(3000);

jobs.active( function( err, ids ) {
    ids.forEach( function( id ) {
        kue.Job.get( id, function( err, job ) {
            job.inactive();
        });
    });
});

module.exports = {
    create: function(name, params) {
        return jobs.create(name, params);
    },
    process: function(name, n, callback) {
        jobs.process(name, n, callback);
    }
};
