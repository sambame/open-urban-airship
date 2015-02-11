/*jslint node: true */
/*eslint-env node */
"use strict";

var moment = require('moment');

/**
 *
 * @param {String|Number} since
 * @returns {Date}
 */
var sinceToDate = function(since) {
    if (!since) {
        return null;
    }

    var m = moment(since);

    if (!m.isValid()) {
        m = moment(parseInt(since))
    }

    if (m.isValid()) {
        return m.toDate();
    }

    return null;
};


module.exports = sinceToDate;