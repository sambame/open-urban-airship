/*jslint node: true */
/*eslint-env node */
"use strict";

var loadCredentials = require("./credentials/load"),
    parseCredentials = require("./credentials/parse"),
    validateCredentials = require("./credentials/validate");

function validateP12(signedData, passphrase, production) {
    return loadCredentials({pfx: signedData, passphrase: passphrase})
        .then(function(credentials) {
            var parsed = parseCredentials(credentials);

            parsed.production = production;
            validateCredentials(parsed);
            return credentials;
        });
}


module.exports = validateP12;