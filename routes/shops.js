var express = require('express');
var router = express.Router();
var async = require('async');


//10.샵 목록 조회
router.get('/', function (req, res, next) {
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

    var listPerPage = 10;
    var condition = req.query.condition; //거리순, 추천순
    var search = req.query.search; // 검색

    var userId = 0;
    if (req.isAuthenticated()) {
        if(req.user.nickname === undefined){
            userId =  req.user.id;
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

    //샵 목록을 select
    function selectshops(connection, callback) {

        var shop_sql =  "select s.id as shop_id, s.name as shopName, s.longitude, s.latitude, "+
                               "ifnull(js.shop_jjim_counts,0) as shop_jjim_counts, pd.mainPhoto "+
                        "from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts " +
                                               "from jjim_shops "+
                                               "group by shop_id)js "+
                                    "on (js.shop_id = s.id) "+
                                    "left join (select from_id, path as mainPhoto "+
                                               "from photo_datas "+
                                               "where from_type = '샵' " +
                                               "LIMIT 0,1) pd "+
                                    "on(pd.from_id = s.id) ";

        if(search != undefined){
            var finding = "where s.name like " + '"%'+search+'%"';
            shop_sql += finding
        }else if(condition==='추천순') {
            var referrals = " order by shop_jjim_counts desc"; // 추천순
            shop_sql += referrals;
        }
        shop_sql += " LIMIT ? OFFSET ?";


        var pageArr = [listPerPage, (page-1)*listPerPage];

        connection.query(shop_sql, pageArr, function (err, shop_results) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, shop_results);
            }
        });
    }

    //JSON 객체 생성
    function resultJSON(shop_results, callback) {
        var shop_results = {
            "successResult": {
                "message": "모든 샵이 정상적으로 조회 되었습니다.",
                "page": page,
                "listPerPage": listPerPage,
                "shopList": shop_results
            }
        };
        callback(null, shop_results);
    }

    async.waterfall([getConnection, selectshops, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
        }
    });
});



//11.샵 상세 조회
router.get('/:shop_id', function (req, res, next) {
    var shop_id = parseInt(req.params.shop_id);
    var userId = 0;
    if (req.isAuthenticated()) {
        if(req.user.nickname === undefined){
            userId =  req.user.id;
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
    //해당 샵 목록을 select
    function selectPickShopDetails(connection, callback) {

        var shop_pick_sql = "select s.id as shop_id ,s.name as shopName, s.address,s.longitude, " +
                                   "s.latitude, s.callnumber, s.usetime "+
                            "from shop s "+
                            "where s.id=? ";

        var shop_pick_photo_sql = "select pd.path as photoURL " +
                                  "from photo_datas pd " +
                                  "where pd.from_type ='샵' and pd.from_id =?";

        var shop_pick_artists_sql =  "select a.id as artist_id, a.nickname as artistNickname, ifnull(ja.artist_jjim_counts, 0) as artistjjim_counts, " +
                                     "a.intro , pd.path as artistProfilePhoto "+
                                     "from artist a left join(select artist_id, count(customer_id) as artist_jjim_counts "+
                                                             "from jjim_artists "+
                                                             "group by artist_id) ja "+
                                                   "on (ja.artist_id = a.id) "+
                                                   "left join (select from_id, path "+
                                                              "from photo_datas "+
                                                              "where from_type = '프로필' " +
                                                              "limit 0,1) pd "+
                                                    "on (pd.from_id = a.id)" +
                                     "where a.shop_id = ?";

        var shop_customer_jjim_sql = "select customer_id, shop_id " +
                                     "from jjim_shops " +
                                     "where customer_id =? and shop_id =? ";

        async.waterfall([function (cb) {
            connection.query(shop_pick_sql, [shop_id], function (err, shopPickResults) {
                if (err) {
                    cb(err);
                } else {
                    cb(null,shopPickResults);
                }
            });
        }, function (shop_pick_results, cb) {
            connection.query(shop_pick_photo_sql, shop_id, function (err, shopPhotoResults) {
                if (err) {
                    cb(err);
                } else {
                    if(shopPhotoResults.length){
                        var shop_photo_URL = [];
                        async.eachSeries(shopPhotoResults, function (urlValue, cb2) {
                            shop_photo_URL.push(urlValue.photoURL);
                            cb2(null);
                        }, function (err) {
                            if (err) {
                                cb(err);
                            } else {
                                shop_pick_results.photoURL = shop_photo_URL;
                                cb(null,shop_pick_results);
                            }
                        });
                    }else{
                        shop_pick_results.photoURL = null;
                        cb(null, shop_pick_results);
                    }
                }
            });
        }, function (shop_pick_results, cb) {
            connection.query(shop_pick_artists_sql, shop_id, function (err, shopInArtistResults) {
                if (err) {
                    cb(err);
                } else {
                    shop_pick_results.attArtists = shopInArtistResults;
                    cb(null, shop_pick_results);
                }
            });
        }, function (shop_pick_results, cb) {
            connection.query(shop_customer_jjim_sql, [userId ,shop_id], function (err, customerJJimResult) {
                if (err) {
                    cb(err);
                } else {
                    shop_pick_results[0].jjim_status = (customerJJimResult.length !== 0) ? 1 : 0 ;
                    cb(null,shop_pick_results);
                }
            });
        }], function (err, shop_pick_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, shop_pick_results);
            }
        });
    }
    //JSON 객체 생성
    function resultJSON(shop_pick_results, callback) {
        var result = {
            "successResult": {
                "message": "해당 샵에 정보가 조회되었습니다.",
                "shop_id" : shop_pick_results[0].shop_id,
                "shopName": shop_pick_results[0].shopName,
                "address": shop_pick_results[0].address,
                "jjim_status": shop_pick_results[0].jjim_status,
                "longitude": shop_pick_results[0].longitude,
                "latitude": shop_pick_results[0].latitude,
                "callnumber": shop_pick_results[0].callnumber,
                "usetime": shop_pick_results[0].usetime,
                "shopPhotos": shop_pick_results.photoURL ,
                "attArtists": shop_pick_results.attArtists
            }
        };
        callback(null, result);
    }
    async.waterfall([getConnection, selectPickShopDetails,  resultJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });
});
module.exports = router;