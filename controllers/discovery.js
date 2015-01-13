/*jslint node: true */
/*eslint-env node */
"use strict";

var fs = require('fs'),
	path = require('path');

exports.get = function(req, res){
  res.send('hello from discovery!');
};

exports.proxy = function(req, res) {
	var filename = path.join(process.cwd(), "/static/discovery/proxy.html");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
};

exports.apis =  function(req, res) {
	var filename = path.join(process.cwd(), "/static/discovery/apis-v1.json");
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);	
};