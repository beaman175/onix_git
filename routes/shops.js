//10.샵 목록 조회
var express = require('express');
var router = express.Router();
var async = require('async');

router.get('/', function (req, res, next) {
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

    var listPerPage = 10;

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
        var sql1 =  "select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber, s.usetime, ifnull(js.shop_jjim_counts,0) as shop_jjim_counts "+
                   "from shop s "+
                   "left join (select shop_id, count(customer_id) as shop_jjim_counts "+
                              "from jjim_shops "+
                              "group by shop_id)js " +
                    "on (js.shop_id = s.id) "+
                    "LIMIT ? OFFSET ?" ;


        /*var sql2 =  "select from_id,concat(pd.path,'/',pd.photoname,file_type) as phtoURL "+
                    "from photo_datas pd "+
                    "where pd.from_type ='샵'";*/

        var pageArr = [listPerPage, (page-1)*listPerPage];

        connection.query(sql1, pageArr, function (err, results) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, results);
                }
        });
    }

    function resultJSON2(results, callback) {
        var shopList=[];
        async.forEach(results,function(item,cb){
            var shop_element= {
                "shop_id": item.id,
                "name": item.name,
                "address": item.address,
                "shop_jjim_counts": item.shop_jjim_counts,
                "jjim_status": "보류",
                "longitude": item.longitude,
                "latitude": item.latitude,
                "calnumber": item.callnumber,
                "usetime": item.usetime
            };
            shopList.push(shop_element);
            cb(null);
        }, function(err) {
            if (err) {
                callback(err);
            } else {
                var shop_results = {
                    "successResult": {
                        "message": "모든 샵이 정상적으로 조회 되었습니다.",
                        "page": page,
                        "listPerPage": listPerPage,
                        "shopList": shopList
                    }
                };
                callback(null, shop_results);
            }
        });
    }

    /*function resultJSON(data, callback) {
        var result = {
            "successResult": {
                "message": "모든 샵이 정상적으로 조회 되었습니다.",
                "page": 1,
                "listPerPage": 10,
                "shopList": [{
                    "shop_id": "1",
                    "name": "오닉스샘플샵",
                    "address": "서울시 강남구 대치2동...",
                    "shop_jjim_counts": "총 찜목록 수",
                    "jjim_status": "찜상태",
                    "longitude": 123.1232,
                    "latitude": 123.1231,
                    "calnumber": "010-xxxx-xxxx",
                    "usetime": "오전 10시 ~ 오후 8시",
                    "shopPhotos": [{"photoURL": "./public/photos/shop/xxxxxx0.jpg"}, {"photoURL": "./public/photos/shop/xxxxxx4.jpg"}],
                    "attArtist": [{
                        "artist_id": "1",
                        "artist_nickname": "네일또오",
                        "artistPhoto": "대표사진 url 경로",
                        "artist_jjim_counts": "아티스트 총 찜 횟수"
                    }, {
                        "artist_id": "2",
                        "artist_nickname": "네일짱짱맨",
                        "artistPhoto": "대표사진 url 경로",
                        "jjim_counts": "아티스트 총 찜 횟수"
                    }]
                }]
            }
        };
        callback(null, results);
    }*/

    async.waterfall([getConnection, selectshops, resultJSON2], function (err, results) {
        if (err) {
            next(err); //데이터 작업중 에러
        } else {
            res.json(results);
            console.log(results);
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