//10.샵 목록 조회
var express = require('express');
var router = express.Router();
var async = require('async');

router.get('/', function (req, res, next) {
    var page = req.query.page;
    var condition = req.query.condition;
    var search = req.query.search;

    console.log(page);
    console.log(condition);
    console.log(search);

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    //샵 목록을 select
    function selectshops(connection, callback) {
        var sql = 'select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber,js.shop_jjim_counts, ' +
                  'concat(pd.path,"/",pd.photoname,file_type) as phtoURL '+
                  'from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts '+
                                         'from jjim_shops ' +
                  'group by shop_id)js ' +
                                   'on (js.shop_id = s.id) '+
                                   'left join (select from_id,path,photoname,file_type' +
                                              'from photo_datas' +
                                              'where from_type = ?) pd '+
                                   'on (pd.from_id = s.id)';


            //var data = [];
            connection.query(sql, '샵', function (err, results) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    console.log(results);
                    callback(null, results);
                }
            });
    }

    function resultJSON2(results, callback) {
        if (err) {

        } else {
            callback(null, results)
        }

    }

    function resultJSON(data, callback) {
        var result = {
            "successResult": {
                "message": "모든 샵이 정상적으로 조회 되었습니다.",
                "page": 1,
                "listPerPage": 10,
                "shopList": [{
                    "shop_id": "1",
                    "name": "오닉스샘플샵",
                    "address": "서울시 강남구 대치2동...",
                    "jjim_counts": "총 찜목록 수",
                    "jjim_status": "찜상태",
                    "longitude": 123.1232,
                    "latitude": 123.1231,
                    "calnumber": "010-xxxx-xxxx",
                    "usetime": "오전 10시 ~ 오후 8시",
                    "intro": "잘해드릴게요",
                    "shopPhotos": [{"photoURL": "./public/photos/shop/xxxxxx0.jpg"}, {"photoURL": "./public/photos/shop/xxxxxx4.jpg"}],
                    "attArtist": [{
                        "artist_id": "1",
                        "artist_nickname": "네일또오",
                        "artistPhoto": "대표사진 url 경로",
                        "jjim_counts": "아티스트 총 찜 횟수"
                    }, {
                        "artist_id": "2",
                        "artist_nickname": "네일짱짱맨",
                        "artistPhoto": "대표사진 url 경로",
                        "jjim_counts": "아티스트 총 찜 횟수"
                    }]
                }]
            }
        };
        callback(null, data);
    }

    async.waterfall([getConnection, selectshops, resultJSON], function (err, result) {
        if (err) {
            next(err); //데이터 작업중 에러
        } else {
            res.json(result);
            console.log(result);
        }
    });
});


//11.샵 상세 조회
router.get('/:shop_id/details', function (req, res, next) {
    var shop_id = req.params.shop_id;

    var result = {
        "successResult": {
            "message": "해당 샵에 정보가 조회되었습니다.",
            "name": "오닉스루비샵",
            "address": "서울시 강서구 화곡3동...",
            "jjim_counts": "총 찜목록 수",
            "jjim_status": "찜상태",
            "longitude": 23.1232,
            "latitude": 23.1231,
            "calnumber": "010-xxxx-xxxx",
            "usetime": "오전 12시 ~ 오후 9시",
            "intro": "언제든지 환영합니다",
            "shopPhotos": [{"photoURL": "./public/photos/shop/xxxxx11.jpg"}, {"photoURL": "./public/photos/shop/xxxxx17.jpg"}],
            "attArtist": [{
                "artist_id": "4",
                "artist_nickname": "네일이얌",
                "artistPhoto": "대표사진 url 경로",
                "jjim_counts": "아티스트 총 찜 횟수"
            }, {
                "artist_id": "6",
                "artist_nickname": "민규짱",
                "artistPhoto": "대표사진 url 경로",
                "jjim_counts": "아티스트 총 찜 횟수"
            }]
        }
    };
    res.json(result);
});
module.exports = router;