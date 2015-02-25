/*jslint node: true */
/*eslint-env node */
"use strict";
var tasks = require("../controllers/tasks"),
    logger = require("../logger"),
    util = require("util"),
    async = require("async"),
    DeviceModel = require("../models/device"),
    ApplicationModel = require("../models/application"),
    request = require("request");

var DEFAULT_ATTEMPTS = 12;

function authHeader(u, p) {
    return "Basic " + new Buffer(u + ":" + p).toString("base64");
}

if (tasks.isSupported) {
    tasks.process("migration.urbanAirship.singleAPID", 50, function (job, done) {
        var url = "https://go.urbanairship.com/api/apids/" + job.data.apid;

        logger.info(util.format("loading apid job %s", url));

        request.get(
            {
                url: url,
                json: true,
                headers: {
                    "Authorization": authHeader(job.data.key, job.data.master_secret)
                }
            },
            function (err, response, apidDevice) {
                if (err) {
                    logger.error(util.format("failed to call urban apid api %s", err), err);
                    return done(err);
                }

                if (response.statusCode >= 400) {
                    logger.error(util.format("failed to call urban apid api %s", response.statusCode));
                    return done(new Error("response failed"));
                }

                if (!apidDevice.gcm_registration_id) {
                    logger.warn(util.format("device %s has no gcm_registration_id", apidDevice.apid));
                    return done();
                }

                var device = {
                    _id: apidDevice.apid,
                    token: apidDevice.gcm_registration_id,
                    alias: apidDevice.alias,
                    platform: "android",
                    _application: job.data.applicationId,
                    active: apidDevice.active,
                    tags: apidDevice.tags
                };

                DeviceModel(device).save(function (err) {
                    if (err) {
                        logger.error(util.format("failed to save Device %s", err), err);
                    }

                    done(err);
                });
            });
    });

    tasks.process("migration.urbanAirship.device_tokens", function (job, done) {
        var url = job.data.url || "https://go.urbanairship.com/api/device_tokens/?";

        logger.info(util.format("loading device_tokens job %s", url));

        ApplicationModel.findOneQ({_id: job.data.key})
            .then(function (application) {
                request.get(
                    {
                        url: url,
                        json: true,
                        headers: {
                            "Authorization": authHeader(job.data.key, job.data.master_secret)
                        }
                    },
                    function (err, response, deviceTokensResponse) {
                        if (err) {
                            logger.error(util.format("failed to call urban device_tokens api %s", err), err);
                            return done(err);
                        }

                        if (response.statusCode >= 400) {
                            logger.error(util.format("failed to call urban device_tokens api %s", response.statusCode));
                            return done(new Error("response failed"));
                        }

                        var deviceTokenTasks = [];

                        function addSingleDevice(deviceToken) {
                            return function (callback) {
                                var device = DeviceModel({
                                        token: deviceToken.device_token,
                                        alias: deviceToken.alias,
                                        platform: "ios",
                                        _application: application._id,
                                        active: deviceToken.active,
                                        tags: deviceToken.tags
                                    }),
                                    upsertData = device.toObject();

                                DeviceModel.findOneAndUpdate(
                                    {
                                        token: deviceToken.device_token
                                    },
                                    upsertData,
                                    {
                                        upsert: true
                                    },
                                    function (err) {
                                        if (err) {
                                            delete upsertData._id;

                                            DeviceModel.findOneAndUpdate(
                                                {
                                                    token: deviceToken.device_token
                                                },
                                                upsertData,
                                                {
                                                    upsert: true
                                                },
                                                function (err) {
                                                    if (err) {
                                                        logger.error(util.format("failed to save Device %s", err), err);
                                                    }
                                                    callback(err);
                                                }
                                            );

                                            return;
                                        }

                                        callback(err);
                                    }
                                );
                            }
                        }

                        for (var i = 0; i < deviceTokensResponse.device_tokens.length; i++) {
                            var currentDeviceToken = deviceTokensResponse.device_tokens[i];
                            deviceTokenTasks.push(addSingleDevice(currentDeviceToken));
                        }

                        async.parallel(deviceTokenTasks, function (err) {
                            if (err) {
                                logger.error(util.format("failed to create device_tokens job %s", err), err);
                                return done(err);
                            }

                            if (deviceTokensResponse.next_page) {
                                tasks.create("migration.urbanAirship.device_tokens", {
                                    key: job.data.key,
                                    master_secret: job.data.master_secret,
                                    url: deviceTokensResponse.next_page
                                }).save(function (err) {
                                    if (err) {
                                        logger.error(util.format("failed to create next device_tokens job %s", err), err);
                                    }
                                    done(err);
                                });
                            } else {
                                logger.info(util.format("device_tokens migration done"));
                                done();
                            }
                        });
                    }
                );
            })
            .catch(function (err) {
                logger.error(util.format("failed to import %s", err), err);
                done(err);
            });
    });

    tasks.process("migration.urbanAirship.apids", function (job, done) {
        var url = job.data.url || "https://go.urbanairship.com/api/apids/";

        logger.info(util.format("loading apids job %s", url));

        ApplicationModel.findOneQ({_id: job.data.key})
            .then(function (application) {
                request.get(
                    {
                        url: url,
                        json: true,
                        headers: {
                            "Authorization": authHeader(job.data.key, job.data.master_secret)
                        }
                    },
                    function (err, response, apidsResponse) {
                        if (err) {
                            logger.error(util.format("failed to call urban apids api %s", err), err);
                            return done(err);
                        }

                        if (response.statusCode >= 400) {
                            logger.error(util.format("failed to call urban apids api %s", response.statusCode));
                            return done(new Error("response failed"));
                        }

                        var apidTasks = [];

                        function addSingleAPID(apid) {
                            return function (callback) {
                                tasks.create(
                                    "migration.urbanAirship.singleAPID",
                                    {
                                        key: job.data.key,
                                        master_secret: job.data.master_secret,
                                        applicationId: application._id,
                                        apid: apid
                                    }).attempts(DEFAULT_ATTEMPTS).backoff({type: 'exponential'}).save(function (err) {
                                        if (err) {
                                            logger.error(util.format("failed to create apid job %s %s", apid, err), err);
                                        }

                                        callback(err);
                                    });
                            }
                        }

                        for (var i = 0; i < apidsResponse.apids.length; i++) {
                            var currentAPID = apidsResponse.apids[i];
                            apidTasks.push(addSingleAPID(currentAPID.apid));
                        }

                        async.parallel(apidTasks, function (err) {
                            if (err) {
                                logger.error(util.format("failed to create apid job %s", err), err);
                                return done(err);
                            }

                            if (apidsResponse.next_page) {
                                tasks.create("migration.urbanAirship.apids", {
                                    key: job.data.key,
                                    master_secret: job.data.master_secret,
                                    url: apidsResponse.next_page
                                }).attempts(DEFAULT_ATTEMPTS).backoff({type: 'exponential'}).save(function (err) {
                                    if (err) {
                                        logger.error(util.format("failed to create next apids job %s", err), err);
                                    }
                                    done(err);
                                });
                            } else {
                                logger.info(util.format("apids migration done"));
                                done();
                            }
                        });
                    }
                )
            })
            .catch(function (err) {
                logger.error(util.format("failed to get application %s", err), err);
                done(err);
            });
    });
}

var migrateFromUrbanAirship = function(req, res, next) {
    var application = req.user.app,
        params = {key: application.key, master_secret: application.master_secret};


    async.parallel([
        function(callback) {
            tasks.create("migration.urbanAirship.apids", params).attempts(DEFAULT_ATTEMPTS).backoff( {type:'exponential'}).save(callback);
        },
        function(callback) {
            tasks.create("migration.urbanAirship.device_tokens", params).attempts(DEFAULT_ATTEMPTS).backoff( {type:'exponential'}).save(callback);
        }
    ], function(err) {
        if (err) {
            return next(err);
        }

        res.end();
    });
};

var migrationDocs = function(Model) {
    return function(req, res) {
        var migrateTasks = [];

        var createNewDoc = function (doc) {
            var deviceData = doc.toObject();

            deviceData._id = deviceData.old_key;
            delete deviceData.old_key;
            delete deviceData.key;
            delete deviceData.apid;
            delete deviceData.status;

            return function (callback) {
                Model(deviceData).save(function (err) {
                    callback(err);
                });
            }
        };

        var deleteOldDoc = function (prevKey) {
            return function (callback) {
                logger.info(util.format("remove doc with id %s", prevKey));
                Model.findOneAndRemove({$or: [{key: prevKey}, {apid: prevKey}]}, function (err, deletedItem) {
                    if (!deletedItem) {
                        return callback(new Error("item not found " + prevKey));
                    }

                    callback(err);
                });
            }
        };

        function addEventTsField(callback) {
            var addOldKeyPropTasks = [];

            Model.find({old_key: {$exists: false}}).lean().exec(function (err, docs) {
                if (err) {
                    return callback(err);
                }

                docs.forEach(function (doc) {
                    addOldKeyPropTasks.push(function (callback) {
                        if (doc.apid) {
                            Model.findOneAndUpdate({token: doc.token}, {
                                $set: {
                                    old_key: doc.apid,
                                    active: true
                                }
                            }, {'new': false}, function (err, updated) {
                                if (!updated) {
                                    return callback(new Error("item not found"));
                                }

                                callback(err);
                            });
                        } else {
                            Model.findOneAndUpdate({secret: doc.secret}, {
                                $set: {
                                    old_key: doc.key,
                                    active: true
                                }
                            }, {'new': false}, function (err, updated) {
                                if (!updated) {
                                    return callback(new Error("item not found"));
                                }

                                callback(err);
                            });
                        }
                    })
                });

                async.waterfall(addOldKeyPropTasks, callback);
            });
        }

        Model.collection.dropIndex("key_1", function (err) {
            addEventTsField(function (err) {
                if (err) {
                    if (err) {
                        logger.error("failed to migrate docs", err);
                        res.status(500);
                    }

                    return res.end()
                }

                Model.find({}, function (err, docs) {
                    for (var i = 0; i < docs.length; i++) {
                        var doc = docs[i],
                            prevKey = doc.old_key;

                        if (!doc.old_key) {
                            continue;
                        }

                        migrateTasks.push(deleteOldDoc(prevKey));
                        migrateTasks.push(createNewDoc(doc));
                    }

                    async.waterfall(migrateTasks, function (err) {
                        if (err) {
                            logger.error("failed to migrate docs", err);
                            res.status(500);
                        }

                        return res.end()
                    });
                });
            });
        });
    }
};


module.exports = {
    urbanAirship: migrateFromUrbanAirship,
    apps: migrationDocs(ApplicationModel),
    devices: migrationDocs(DeviceModel),
};