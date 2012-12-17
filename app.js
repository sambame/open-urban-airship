var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    discovery = require('./controllers/discovery'),
    device = require('./controllers/device'),
    application = require('./controllers/application'),
    push = require('./controllers/push'),
    verbose = process.env.NODE_ENV != 'test',
    app = module.exports = express();

var mongoUri = process.env.MONGOLAB_URI || process.argv[2];
mongoose.connect(mongoUri);

console.log("mongodb: %s", mongoUri);

app.map = function (a, route) {
    route = route || '';
    for (var key in a) {
        switch (typeof a[key]) {
            // { '/path': { ... }}
            case 'object':
                app.map(a[key], route + key);
                break;
                // get: function(){ ... }
            case 'function':
                if (verbose) console.log('%s %s', key, route);
                app[key](route, a[key]);
                break;
        }
    }
};

var ObjectId = require('mongoose').Types.ObjectId;

if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str) {
        return this.indexOf(str) === 0;
    };
}

app.map({
    '/api': {
        '/application/?': {
            put: application.create,
            get: application.list            
        },
        '/device_tokens/:token': {
            put: device.put
        },
        '/device_tokens/?': {
            put: device.put,
            get: device.list
        },
        '/push/': {
            post: push.push
        },
        '/discovery': {
			get: discovery.get,
			'/v1/apis': {
				get: discovery.apis,
				'/application/v1/rest': {
					get: application.apis
				},
				'/device_token/v1/rest': {
					get: device.apis
				},
				'/push/v1/rest': {
					get: push.apis
				}				
			}
		},
		'/static/proxy.html': {
			get: discovery.proxy
        }
    }
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on %d", port);
});