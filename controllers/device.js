var application = require('./application'),
    DeviceModel = require("../models/device").DeviceModel,
    apns = require('apn'),
 	fs = require('fs'),
	path = require('path');
		
var createDevice = function (req, res) {
    var output = '';
    req.setEncoding('utf8');

    req.on('data', function (chunk) {
        output += chunk;
    });

    req.on('end', function () {
    	var obj = {}; 
		if (output && output.length > 0) {
			obj = JSON.parse(output);
			console.log(obj);
		}

		application.getByRequestAuthApp(req, obj, function (err, app) {
			if (!err) {
				var deviceToken = (req.params.token || req.query.token).toLowerCase();
				
				try {
					new apns.Device(deviceToken);
				} catch (Error) {
					res.statusCode = 400;
					res.send('Invalid device token ' + deviceToken);
					return;	
				}

				DeviceModel.findOne({token: deviceToken, _application: app._id}, function(err, device) {
					if (!err) {
						if (!device) {
							device = new DeviceModel();
							device.token = deviceToken;
							device._application = app._id;
						}

						device.alias = obj.alias;
						device.status = 'active';
						
						device.save(function(err) {
							if (err) {
								console.error("failed to save device %s", err);
							}
						});
					} else {
						console.error("failed to look for device %s", err);
					}
				});				
				res.send('OK!');
			} else {
				console.error('Failed to look for application %s', err);
				res.statusCode = 400;
				res.send('Application not found');
			}
		});
    });
};

var listDevices = function (req, res) {
    var output = '';
    req.setEncoding('utf8');
	console.log('list devices');
	
    req.on('data', function (chunk) {
        output += chunk;
        
    });

    req.on('end', function () {
		var obj = {}; 
		if (output.length > 0) {
			obj = JSON.parse(output);
			console.log(obj);
		}
	
		application.getByRequestAuthMaster(req, obj, function (err, app) {
			if (!err) {
				getByApplication(app).lean().exec(function(err, devices) {
					var deviceTokens = [];
					var activeDevices = 0;

					if (err) {
						res.statusCode = 500;
					} else {					
						devices.forEach(function(device) {
							var deviceToken = {device_token: device.token, active: device.status === 'active'};
							
							if (device.alias) {
								deviceToken.alias = device.alias;
							}
							
							if (deviceToken.active) {
								activeDevices += 1;
							}
							
							deviceTokens.push(deviceToken);
						});
					}

					var list = {
						device_tokens_count: deviceTokens.length, 
						device_tokens: deviceTokens,
						active_device_tokens_count: activeDevices
					};
				
					res.contentType('json');
					res.send(list);				
				});
			} else {
				console.error('Failed to look for application %s', err);
				res.statusCode = 400;
				res.send('Application not found');
			}
		});
    });
};


var getByApplication = function (app, cb) {
    return DeviceModel.find({
        _application: app._id
    });
};

var getByAliasesAndDeviceIds = function (application, aliases, deviceTokens, cb) {
	aliases = aliases || [];
	deviceTokens = deviceTokens || [];
	 
    console.log("looking for devices by aliases %s and tokens", aliases, deviceTokens);
    DeviceModel.find({$or: [
        	{alias: {$in: aliases}},
        	{token: {$in: deviceTokens}}
        	],
        _application: application._id
    }, function(err, devices) {
		if (err) {
			console.error('failed to find devices by alias %s', err);
		}
		
		cb(err, devices);
    });
};

var apis = function(req, res) {
	var filename = path.join(process.cwd(), "/static/discovery/devices-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

module.exports = {
  put: createDevice,
  list: listDevices,
  getByAliasesAndDeviceIds: getByAliasesAndDeviceIds,
  apis: apis
};