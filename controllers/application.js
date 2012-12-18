 var ApplicationModel = require("../models/application").ApplicationModel,
 	logger = require("../logger").logger,
 	fs = require('fs'),
	path = require('path');

var createApplication = function (req, res) {
    var output = '';
    req.setEncoding('utf8');

    req.on('data', function (chunk) {
        output += chunk;
    });

    req.on('end', function () {
        var obj = JSON.parse(output);
        logger.debug(obj);

		ApplicationModel.findOne({name: obj.name}, function(err, application) {
			if (!err) {
				if (!application) {
					application = new ApplicationModel();
					application.name = obj.name;
				}

				application.development = obj.development;
        
				var fileMoniker = 'file://';

				if (obj.apple_push_certificate.startsWith(fileMoniker)) {
					application.apple_push_certificate_filename = obj.apple_push_certificate.substring(fileMoniker.length, obj.apple_push_certificate.length);
					logger.debug('using certificate %s', application.apple_push_certificate_filename);
				} else {
					application.apple_push_certificate = obj.apple_push_certificate;
				}

				if (obj.apple_push_key.startsWith(fileMoniker)) {
					application.apple_push_key_filename = obj.apple_push_key.substring(fileMoniker.length, obj.apple_push_key.length);
					logger.debug('using certificate %s', application.apple_push_key_filename);
				} else {
					application.apple_push_key = obj.apple_push_key;
				}
        
				application.passphrase = obj.passphrase;
				application.secret_key_push = obj.secret_key_push;
				application.secret_key = obj.secret_key;
				application.access_key = obj.access_key;
				application.save();
		
				logger.debug('saving application %s', obj.name);
	
				res.send('OK!');
			} else {
				logger.error('Failed to register application %s', err);
				
				res.statusCode = 500; 
				res.send('FAILED!');
			}
		});
    });
};

var listApplications = function (req, res) {
    var output = '';
    req.setEncoding('utf8');

	logger.debug('listApplications');
	
    req.on('data', function (chunk) {
        output += chunk;
        
    });

    req.on('end', function () {
		ApplicationModel.find().lean().exec(function(err, applications) {
			var list = [];
	
			if (err) {
				res.statusCode = 500;
			} else {					
				applications.forEach(function(app) {
					list.push({
	    				name: app.name,
	    				secret_key_push: app.secret_key_push,
	    				secret_key: app.secret_key,
	    				access_key: app.access_key,
	    				development: app.development,
	    				apple_push_certificate: app.apple_push_certificate,
	    				apple_push_certificate_filename: app.apple_push_certificate_filename,
	    				apple_push_key: app.apple_push_key,
	    				apple_push_key_filename: app.apple_push_key_filename
	    			});
				});
			}
	
			res.contentType('json');
			res.send({applications: list});				
		});
	});
};
 
var getByRequestAuth = function (req, extraData, cb, validateSecret) {
    var authorization = req.headers.authorization;
    extraData = extraData || {};
    
    logger.debug('using authorization %s data %s', authorization, JSON.stringify(extraData));
     
    if (!authorization) {
        secret_key = extraData.secret_key || req.query.secret_key;
        access_key = extraData.access_key || req.query.access_key;
        
        if (!secret_key || !access_key) {        
			cb(new Error('missing authorization'), null);
			return;
        }
        
        var authorizationString = access_key + ":" + secret_key;
        authorization = "Basic " + new Buffer(authorizationString).toString('base64');
    }
    
    logger.debug('using authorization %s', authorization);
    
    var basicMethod = 'Basic';
    if (authorization.startsWith(basicMethod)) {
        authorization = authorization.substring(basicMethod.length + 1, authorization.length);
        authorization = new Buffer(authorization, 'base64').toString('ascii');
        
        var parts = authorization.split(':');
        var auth_access_key = parts[0];
        var auth_secret = parts[1];

		logger.debug('looking for application %s', auth_access_key);
        ApplicationModel.findOne({
            access_key: auth_access_key
        }, function (err, app) {
        	if (err) {
        		logger.error('failed to look for application %s', err);
        	}
			else if (app) {
				logger.debug('application found: %s (%s)', app, err);
				logger.debug('%s, %s', app.secret_key_push, auth_secret);
				if (app !== null && validateSecret(app, auth_secret) === false) {
					app = null;
					err = new Error('Invalid application secret');
				}
            } else {
            	err = new Error('application not found');
            }

            cb(err, app);
        });
    } else {
		cb(new Error('Not supported auth ' + authorization), null);
    }
};
 
var getByRequestAuthMaster = function (req, extraData, cb) {
 	logger.debug('looking app by master secret');
 	getByRequestAuth(req,
 		extraData,
 		cb,
 		function(app, secret) {
 			if (app.secret_key_push !== secret) {
 				logger.error(util.format('applcation master secret mismatch %s!==%s', app.secret_key_push, secret));
 			}
 			
 			return app.secret_key_push === secret;
 		});
 };
 
 var getByRequestAuthApp = function (req, extraData, cb) {
 	logger.debug('looking app by app secret');
 	getByRequestAuth(req,
 		extraData,
 		cb,
 		function(app, secret) {
 			if (app.secret_key !== secret) {
 				logger.error(util.format('applcation secret mismatch %s!==%s', app.secret_key, secret));
 			}

 			return app.secret_key === secret;
 		});
 };
 
var apis = function(req, res) {
	var filename = path.join(process.cwd(), "/static/discovery/applications-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

module.exports = {
	create: createApplication,
	getByRequestAuthMaster:  getByRequestAuthMaster,
	getByRequestAuthApp: getByRequestAuthApp,
	list: listApplications,
	apis: apis
};
