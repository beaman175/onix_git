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

        var shop_sql =  "select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber, s.usetime, " +
          "ifnull(js.shop_jjim_counts,0) as shop_jjim_counts "+
          "from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts "+
          "from jjim_shops "+
          "group by shop_id)js " +
          "on (js.shop_id = s.id) ";

        if(search != undefined){
            var finding = "where a.nickname like " + '"%'+search+'%"';
            shop_sql += finding
        }else if(condition==='추천순') {
            var referrals = " order by artist_jjim_counts desc"; // 추천순
            shop_sql += referrals;
        }
        shop_sql += " LIMIT ? OFFSET ?";


        var pageArr = [listPerPage, (page-1)*listPerPage];

        connection.query(shop_sql, pageArr, function (err, shop_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, shop_results);
            }
        });
    }
    //샵 사진과 소속 아티스트들을 가져온다
    function selectShopDetails(connection, shop_results, callback) {
        var idx = 0; //인덱스
        var userId = 0;
        if (req.isAuthenticated()) {
            if(req.user.nickname === null){
                userId = req.user.id;
            }
        }

        async.eachSeries(shop_results, function(item,cb){
            var shop_photo_sql = "select concat(pd.path,'/',pd.photoname,file_type) as photoURL "+
                                 "from photo_datas pd "+
                                 "where pd.from_type ='샵' and pd.from_id =?";

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

            var shop_customer_jjim_sql = "select customer_id, shop_id " +
                                         "from jjim_shops " +
                                         "where customer_id =? and shop_id =? ";

            async.series([function (cb2) {
                connection.query(shop_photo_sql, item.id, function (err, shop_photo_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        shop_results[idx].photoURL = shop_photo_results;
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(shop_in_artist_sql, item.id, function (err, shopInArtistResults) {
                    if (err) {
                        cb2(err);
                    } else {
                        shop_results[idx].attArtists = shopInArtistResults;
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(shop_customer_jjim_sql, [userId ,item.id], function (err, customerJJimResult) {
                    if (err) {
                        cb2(err);
                    } else {
                        shop_results[idx].jjim_status = (customerJJimResult.length !== 0) ? 1 : 0 ;
                        cb2(null);
                    }
                });
            }], function (err) {
                if (err) {
                    cb(err);
                } else {
                    idx++;
                    cb(null);
                }
            });

        }, function (err) {
            if (err) {
                callback(err);
            } else {
                connection.release();
                callback(null, shop_results);
            }
        });
    }


    //JSON 객체 생성
    function resultJSON(shop_results, callback) {
        var shopList=[];

        async.eachSeries(shop_results, function(item, cb){
            var shop_element= {
                "shop_id": item.id,
                "name": item.name,
                "address": item.address,
                "shop_jjim_counts": item.shop_jjim_counts,
                "jjim_status": item.jjim_status,
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
    async.waterfall([getConnection, selectshops,selectShopDetails,  resultJSON], function (err, results) {
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
        var userId = 0;
        if (req.isAuthenticated()) {
            if(req.user.nickname === null){
                userId = req.user.id;
            }
        }

        var shop_pick_sql = "select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber, s.usetime, " +
                            "ifnull(js.shop_jjim_counts,0) as shop_jjim_counts " +
                            "from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts " +
                                                   "from jjim_shops " +
                                                   "where shop_id = ? )js " +
                                        "on (js.shop_id = s.id) " +
                            "where shop_id=?";

        var shop_pick_photo_sql = "select from_id,concat(pd.path,'/',pd.photoname,file_type) as phtoURL " +
                                  "from photo_datas pd " +
                                  "where pd.from_type ='샵' and pd.from_id =?";

        var shop_pick_artists_sql =  "select a.id, a.nickname, ifnull(ja.artist_jjim_counts, 0) as artist_jjim_counts, " +
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

        var shop_customer_jjim_sql = "select customer_id, shop_id " +
                                     "from jjim_shops " +
                                     "where customer_id =? and shop_id =? ";

        async.waterfall([function (cb) {
            connection.query(shop_pick_sql, [shop_id,shop_id], function (err, shopPickResults) {
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
                    shop_pick_results.photoURL = shopPhotoResults;
                    cb(null, shop_pick_results);
                }
            });
        }, function (shop_pick_results, cb) {
            connection.query(shop_pick_artists_sql, shop_id, function (err, shopInArtistResults) {
                if (err) {
                    cb(err);
                } else {
                    shop_pick_results.attArtists = shopInArtistResults;
                    cb(null,shop_pick_results);
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
                "name": shop_pick_results[0].name,
                "address": shop_pick_results[0].address,
                "jjim_counts": shop_pick_results[0].shop_jjim_counts,
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