/*jslint node: true */
/*eslint-env node */
"use strict";

var loadCredentials = require("./credentials/load"),
    parseCredentials = require("./credentials/parse"),
    validateCredentials = require("./credentials/validate"),
    Q = require("q"),
    _ = require("lodash");

/**
 *
 * @param {Object} certificates
 * @returns {*}
 */
function validateP12(certificates) {
    var futures = [];
    _.forOwn(certificates, function(certificateData, name) {
        var q = loadCredentials({pfx: certificateData.pfx, passphrase: certificateData.passphrase})
            .then(function(credentials) {
                var parsed = parseCredentials(credentials);

                validateCredentials(parsed);

                var certificate = parsed.certificates[0],
                    validity = certificate.validity();

                var attributes = certificate._cert.subject.attributes,
                    attributeIndex = _.findIndex(attributes, function(attribute) {
                        return attribute.type === "0.9.2342.19200300.100.1.1";
                    });

                certificateData.userId = attributeIndex > -1 ? attributes[attributeIndex].value : "not found";
                certificateData.sandbox = !!certificate.environment().sandbox;
                certificateData.production = !!certificate.environment().production;
                certificateData.pushExpirationDate = validity.notAfter;
                certificateData.name = name;

                return certificateData;
            });

        futures.push(q);
    });

    return Q.all(futures).
        then(function(results) {
            _.forEach(results, function(result) {
                certificates[result.name] = result;
                delete result.name;
            });

            return certificates;
        });
}


module.exports = validateP12;