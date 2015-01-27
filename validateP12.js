/*jslint node: true */
/*eslint-env node */
"use strict";

var openssl = require('openssl-wrapper'),
    moment = require('moment');

function validateP12(signedData, password) {
    return openssl.qExec('pkcs12', signedData, {password: "pass:"+password})
        .then(function(pemData) {
            return openssl.qExec('x509', pemData, {noout: true, enddate: true});
        })
        .then(function(data) {
            var prefix = "notAfter=";
            data = data.toString('utf8');
            if (data.lastIndexOf(prefix) !== 0) {
                throw new Error("Invalid file mismatch header " + data);
            }

            data = data.substr(prefix.length);

            var d = moment(data, 'MMM D HH:mm:ss YYYY ZZ');

            if (!d.isValid()) {
                throw new Error("Invalid file (date)");
            }

            if (d.toDate() < new Date()) {
                throw new Error("Certificate date has pass " + d.format());
            }

            return d.toDate();
        })
}


module.exports = validateP12;