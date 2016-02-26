var express = require('express');
var router = express.Router();

//3.로컬로그인
router.post('/local', function (req, res, next) {
    if (req.secure) {
        var email_id = req.body.email_id; //고객,아티스트 id
        var password = req.body.password; // 비밀번호
        var registration_token = req.body.registration_token; //고객 푸시 토큰
        var user_type = req.body.user_type; // 로그인 타입( 고객: 1, 아티스트: 2)
        router.post('/login', function (req, res, next) {

            function getUserInput(callback) {
                var user = {
                    "email_id": req.body.email_id,
                    "password": req.body.password
                };
                callback(null, user);
            }

            function getConnection(user, callback) {
                pool.getConnection(function (err, connection) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, user, connection);
                    }
                });
            }

            function selectUser(user, connection, callback) {
                var sql = "select id, password " +
                    "from user " +
                    "where username=?";
                connection.query(sql, [user.username], function (err, results) {
                    connection.release();
                    if (err) {
                        callback(err);
                    }
                    else {
                        if (results.length === 0) {
                            callback(new Error('사용자가 존재하지 않습니다.'));
                        } else {
                            user.id = results[0].id;
                            user.hashPassword = results[0].password;
                            callback(null, user);
                        }
                    }
                });
            }

            function compareUserInput(user, callback) {
                bcrypt.compare(user.password, user.hashPassword, function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        if (result) {
                            req.session.userID = user.id;
                            var success = {
                                "message": "가입이 정상적으로 처리되었습니다"
                            };
                            callback(null, success);
                        } else {
                            var fail = {
                                "message": "회원 가입 하지 못 하였습니다"
                            }
                            callback(null, fail)
                        }
                    }
                });
            }

            //task 수행 간 결과를 입력으로 전달하는 구조를 지원
            async.waterfall([getUserInput, getConnection, selectUser, compareUserInput], function (err, result) {
                if (err) {
                    next(err);
                } else {
                    res.json(result);
                }
            });

        });
        var result = {
            "successResult": {
                "message": "로그인 되셨습니다"
            }
        };
        res.json(result);
    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!');
        err.status = 426;
        next(err);
    }
});

//4.페이스북로그인
router.post('/facebook', function (req, res, next) {
    if (req.secure) {
        var access_token  = req.body.access_token; // 비밀번호
        var registration_token = req.body.registration_token; //고객 푸시 토큰

        var result = {
            "successResult": {
                "message": "로그인 되셨습니다"
            }
        };
        res.json(result);
    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!');
        err.status = 426;
        next(err);
    }
});

module.exports = router;