/**
 * Created by skplanet on 2016-02-05.
 */
var mysql = require('mysql');
var dbconfig = require('./dbconfig');

module.exports = mysql.createPool(dbconfig);
