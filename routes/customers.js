var express = require('express');
var router = express.Router();
var async = require('async');
var bcrypt = require('bcrypt');
var hexkey = process.env.FMS_SERVER_KEY;

var winston = require('winston');
var winstonconfig = require('../config/winstonconfig');
var logging = new winston.Logger(winstonconfig);

//1.고객 로컬 회원 가입
router.post('/', function(req, res, next) {
    if (req.secure) {
        var email_id = req.body.email_id;
        var password = req.body.password;

        // 3. get connection
        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }

        function selectCustomer(connection, callback) {
            var sql = "select id " +
              "        from artist "+
              "        WHERE email_id = aes_encrypt(" + connection.escape(email_id) + ",unhex(" + connection.escape(hexkey) + "))" +
              "        union all "+
              "        select id "+
              "        from customer "+
              "        WHERE email_id = aes_encrypt(" + connection.escape(email_id) + ",unhex(" + connection.escape(hexkey) + "))";
            connection.query(sql, function (err, results) {
                if (err) {
                    logging.log('error','중복 확인 쿼리 에러');
                    connection.release();
                    callback(err);
                } else {
                    if (results.length !== 0) { //그런사람 있음
                        logging.log('error','아이디가 중복됩니다.');
                        connection.release();
                        var err = new Error('아이디가 중복됩니다.');
                        err.statusCode = -101;
                        callback(err);
                    } else {
                        callback(null, connection);
                    }
                }
            });

        }

        // 1. salt generation -- 원본에 대한 보안성을 높이기 위해서 rainbow table에 salt값을 추가
        function generateSalt(connection, callback) {
            var rounds = 10;
            bcrypt.genSalt(rounds, function (err, salt) {
                if (err) {
                    logging.log('error','Sale 에러');
                    connection.release();
                    callback(err);
                } else {
                    callback(null, salt, connection);
                }
            }); //salt 생성횟수
        }

        // 2. hash password generation
        function generateHashPassword(salt, connection, callback) {
            bcrypt.hash(password, salt, function (err, hashPassword) {
                if (err) {
                    logging.log('error','Hash 에러');
                    connection.release();
                    callback(err);
                } else {
                    callback(null, hashPassword, connection);
                }
            });
        }


        // 4. DB insert
        function insertCustomer(hashPassword, connection, callback) {
            var sql = "insert into customer (email_id, password) " +
              "        VALUES (aes_encrypt(" + connection.escape(email_id) + ", unhex(" + connection.escape(hexkey) + ")), " +
                              connection.escape(hashPassword) + ")";

            connection.query(sql, function (err, result) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }

        async.waterfall([getConnection, selectCustomer, generateSalt, generateHashPassword, insertCustomer], function (err) {
            if (err) {
                next(err);
            } else {
                var result = {
                    "successResult": {
                        "message": "가입이 정상적으로 처리되었습니다"
                    }
                };
                res.json(result);
            }
        });
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});


module.exports = router;