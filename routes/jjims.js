var express = require('express');
var router = express.Router();
var async = require('async');
// 6.찜조회
router.get('/', function (req, res, next) {
    var user_type = parseInt(req.query.user_type); //user_type :1(고객), 2(아티스트)
    var page = req.query.page;

    if (user_type === 1) { // 1(고객) 일 경우
        var result = {
            "successResult": {
                "message": "찜목록 보기를 조회하였습니다",
                "page": 1,
                "listPerPage": 10,
                "counts_artists": "찜한 아티스트 총 수",
                "counts_shops": "찜한 샵 총 수",
                "artistsList": [
                    {"artist_id": "1", "nickname": "네일해썸"},
                    {"artist_id": "2", "nickname": "네일또오"}
                ],
                "shopsList": [
                    {"shop_id": "1", "name": "오닉스샘플샵"},
                    {"shop_id": "2", "name": "루비샘플샵"},
                ]
            }
        };
        res.json(result);
    } else { // 2(아티스트) 일 경우
        var result = {
            "successResult": {
                "message": "찜목록 보기를 조회하였습니다",
                "page": 1,
                "listPerPage": 10,
                "counts_artists": "찜한 아티스트 총 수",
                "counts_shops": "찜한 샵 총 수",
                "customersList": [
                    {"customer_id": "1", "registration_id ": "abcdefg"},
                    {"customer_id": "2", "registration_id ": "xyzklnmfo"}
                ]
            }
        };
        res.json(result);
    }
});

//8.찜하기
router.post('/:target_id/plus', function (req, res, next) {
    var target_id = req.params.target_id;
    var target = parseInt(req.body.target); //2(아티스트), 3(shop) (필수사항)
    var userId = 0;

    function checkingTarget(callback) {
        if (target === 2 || target === 3) {
            if (req.isAuthenticated()) {
                if (req.user.nickname === undefined) {
                    userId = req.user.id;
                    callback(null);
                }
            }
        }else{
            var failResult = {
                "err_code": -109,
                "message": "찜하기에 에러가 발생하였습니다."
            };
            callback(failResult);
        }
    }

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    function insertJJim(connection, callback) {
        if (target === 2) {
            var jjim_sql = "insert into jjim_artists(customer_id, artist_id) values (?,?)";
        } else {
            var jjim_sql = "insert into jjim_shops(customer_id, shop_id) values (?,?)";
        }
        connection.query(jjim_sql, [userId, target_id], function (err, jjimResult) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                var result = {
                    "successResult": {
                        "message": "찜이 추가 되었습니다"
                    }
                };
                callback(null, result);
            }
        });
    }

    async.waterfall([checkingTarget, getConnection, insertJJim], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });

});

//9.찜삭제
router.delete('/:target_id/minus', function (req, res, next) {
    var target_id = req.params.target_id;
    var target = parseInt(req.body.target); //2(아티스트), 3(shop) (필수사항)
    var userId = 0;

    function checkingTarget(callback) {
        if (target === 2 || target === 3) {
            if (req.isAuthenticated()) {
                if (req.user.nickname === undefined) {
                    userId = req.user.id;
                    callback(null);
                }
            }
        }else{
            var failResult = {
                "err_code": -110,
                "message": "찜삭제 하는 도중에 에러가 발생하였습니다."
            };
            callback(failResult);
        }
    }

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }
    function deleteJJim(connection, callback){
        if (target === 2) {
            var jjim_sql = "delete from jjim_artists where customer_id=? and artist_id=? ";
        } else {
            var jjim_sql = "delete from jjim_shops where customer_id=? and shop_id=? ";
        }
        connection.query(jjim_sql, [userId, target_id], function (err, jjimResult) {
            connection.release();
            if(err){
                callback(err);
            }else{
                var result = {
                    "successResult": {
                        "message": "해당 찜이 삭제 되었습니다"
                    }
                };
                callback(null, result);
            }
        });
    }

    async.waterfall([checkingTarget, getConnection, deleteJJim], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });
});

module.exports = router;