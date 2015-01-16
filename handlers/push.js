/*jslint node: true */
/*eslint-env node */
"use strict";

var device = require("./../controllers/device"),
	Push = require("./../controllers/push"),
	Device = require("../controllers/device"),
 	fs = require("fs"),
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

	Push.push(req.user.app, req.body.audience, req.body.notification, function(err, devices) {
 		if (err) {
			return res.status(500).end();
		}

		res.json({
			"ok": true,
			"push_ids": devices.map(function(device) {
				return device.apid;
			})
		});
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
