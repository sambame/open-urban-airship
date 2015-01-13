/*jslint node: true */
/*eslint-env node */
"use strict";

var apns = require("apn"),
	device = require("./../controllers/device"),
	Push = require("./../controllers/push"),
	Device = require("../controllers/device"),
	logger = require("../logger"),
 	fs = require("fs"),
	util = require("util"),
	path = require("path");	


var push = function (req, res) {
	if (!req.user.masterAuth) {
		return res.status(401).end()
	}

	if (!req.body.audience) {
		return res.status(400).end()
	}

	if (!req.body.notification) {
		return res.status(400).end()
	}

	Push.push(req.user.app, req.body.audience, req.body.notification, function(err) {
		if (err) {
			return res.status(500).end();
		}

		res.send("OK");
	});
};

var apis = function(req, res) {
	var filename = path.join(process.cwd(), "/static/discovery/push-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

module.exports = {
	push: push,
	apis: apis
};
