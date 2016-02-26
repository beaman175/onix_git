var express = require('express');
var router = express.Router();
var async = require('async');


//10.샵 목록 조회
router.get('/', function (req, res, next) {
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

    var idx = 0; //인덱스
    var listPerPage = 10;

    var condition = req.query.condition; //거리순, 추천순

    var search = req.query.search; // 검색

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
        var referrals = "order by shop_jjim_counts desc"; // 추천순
        var finding = "where s.name = " +search;

        var shop_sql1 =  "select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber, s.usetime, " +
                                "ifnull(js.shop_jjim_counts,0) as shop_jjim_counts "+
                         "from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts "+
                                                "from jjim_shops "+
                                                "group by shop_id)js " +
                         "on (js.shop_id = s.id) "+
                         "LIMIT ? OFFSET ?" ;

        var pageArr = [listPerPage, (page-1)*listPerPage];

        connection.query(shop_sql1, pageArr, function (err, shop_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, shop_results);
            }
        });
    }
    //샵 사진을 가져온다
    function selectShopPhotos(connection, shop_results, callback) {
        idx=0;
        async.eachSeries(shop_results, function(item,cb){
            var shop_photo_sql = "select concat(pd.path,'/',pd.photoname,file_type) as photoURL "+
                                 "from photo_datas pd "+
                                 "where pd.from_type ='샵' and pd.from_id =?";
            connection.query(shop_photo_sql, item.id, function (err, shop_photo_results) {
                if (err) {
                    cb(err);
                } else {
                    shop_results[idx].photoURL= shop_photo_results;
                    idx++;
                    cb(null);
                }
            });
        },function(err){
            if (err) {
                callback(err);
            } else {
                callback(null,connection, shop_results);
            }
        });
    }

    //샵소석 아티스트를 select
    function selectShopsInArtist(connection, shop_results, callback) {
        idx=0;
        async.eachSeries(shop_results, function(item,cb){
            var shop_in_artist_sql =  "select a.id, a.nickname, ifnull(ja.artist_jjim_counts, 0) as artist_jjim_counts, " +
                                      "concat(pd.path,'/',pd.photoname,file_type) as photoURL "+
                                      "from artist a left join(select id " +
                                                              "from shop) s "+
                                                    "on (a.shop_id = s.id)" +
                                                    "left join(select artist_id, count(customer_id) as artist_jjim_counts "+
                                                              "from jjim_artists "+
                                                              "group by artist_id) ja "+
                                                    "on (ja.artist_id = a.id) "+
                                                    "left join (select id,from_id,path,photoname,file_type "+
                                                               "from photo_datas "+
                                                               "where from_type = '아티스트' " +
                                                               "group by from_id) pd "+
                                                    "on (pd.from_id = a.id)" +
                                      "where s.id = ?";
            connection.query(shop_in_artist_sql, item.id, function (err, shopInArtistResults) {
                if (err) {
                    cb(err);
                } else {
                    shop_results[idx].attArtists = shopInArtistResults;
                    idx++;
                    cb(null);
                }
            });
        },function(err){
            if (err) {
                callback(err);
            } else {
                connection.release();
                callback(null,shop_results);
            }
        });
    }
    //JSON 객체 생성
    function resultJSON(shop_results, callback) {
        var shopList=[];

        async.forEach(shop_results, function(item, cb){
            var shop_element= {
                "shop_id": item.id,
                "name": item.name,
                "address": item.address,
                "shop_jjim_counts": item.shop_jjim_counts,
                "jjim_status": "보류",
                "longitude": item.longitude,
                "latitude": item.latitude,
                "callnumber": item.callnumber,
                "usetime": item.usetime,
                "photoURL" : item.photoURL,
                "attArtists" : item.attArtists
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
    async.waterfall([getConnection, selectshops,selectShopPhotos, selectShopsInArtist, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
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
            "attArtists": [{
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