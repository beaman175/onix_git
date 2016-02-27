var mysql = require('mysql');
var dbconfig = require('./dbconfig_test');

module.exports = mysql.createPool(dbconfig);
