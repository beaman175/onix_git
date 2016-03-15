var express = require('express');
var router = express.Router();
var async = require('async');

//11.샵 목록 조회
router.post('/', function (req, res, next) {
  var page = parseInt(req.body.page);
  page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

  var listPerPage = 10;

  var condition = parseInt(req.body.condition); //추천순(1), 거리순(2)
  var search = req.body.search; // 검색

  var userLatitude = parseFloat(req.body.userLatitude); //사용자 현위치 위도
  var userLongitude = parseFloat(req.body.userLongitude); // 사용자 현위치 경도
  var pageArr = [];

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


    if (isNaN(userLatitude) || isNaN(userLongitude)) {

      var shop_sql = "select s.id as shop_id, s.name as shopName, " +
        "                    ifnull(js.shop_jjim_counts,0) as shop_jjim_counts, pd.mainPhoto " +
        "             from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts " +
        "                                      from jjim_shops " +
        "                                      group by shop_id)js " +
        "                           on (js.shop_id = s.id) " +
        "                           left join (select from_id, path as mainPhoto " +
        "                                      from photo_datas " +
        "                                      where from_type = 1 " +
        "                                      group by from_id) pd " +
        "                           on(pd.from_id = s.id) ";
      pageArr = [listPerPage, (page - 1) * listPerPage];
    } else {
      var shop_sql = "select s.id as shop_id, s.name as shopName, " +
        "                      ifnull(js.shop_jjim_counts,0) as shop_jjim_counts, pd.mainPhoto, " +
        "                      round(6371 * acos(cos(radians(?)) * cos(radians(y(s.loc_point))) * cos(radians(x(s.loc_point)) - radians(?)) " +
        "                     + sin(radians(?)) * sin(radians(y(s.loc_point)))), 2) AS distance " +
        "               from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts " +
        "                                      from jjim_shops " +
        "                                      group by shop_id)js " +
        "                           on (js.shop_id = s.id) " +
        "                           left join (select from_id, path as mainPhoto " +
        "                                      from photo_datas " +
        "                                      where from_type = 1 " +
        "                                      group by from_id) pd " +
        "                           on(pd.from_id = s.id) ";
      pageArr = [userLatitude, userLongitude, userLatitude, listPerPage, (page - 1) * listPerPage];
    }
    if (search != undefined) {
      var finding = "where s.name like " + '"%' + search + '%"';
      shop_sql += finding
    }
    if (condition === 1 ) {
      var referrals = " order by shop_jjim_counts desc "; // 추천순
      shop_sql += referrals;
    }
    else if (condition === 2 ) {
      var orderDistance = "round(6371 * acos(cos(radians(?)) * cos(radians(y(s.loc_point))) * cos(radians(x(s.loc_point)) - radians(?)) " +
        "                  + sin(radians(?)) * sin(radians(y(s.loc_point)))), 2)";
      var referrals = "order by " + orderDistance + " desc "; // 거리순
      shop_sql += referrals;
      pageArr = [userLatitude, userLongitude, userLatitude, userLatitude, userLongitude, userLatitude, listPerPage, (page - 1) * listPerPage];
    }
    shop_sql += " LIMIT ? OFFSET ?";


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
      var error = new Error('샵의 정보를 불러오기에 실패하였습니다.');
      error.statusCode = -111;
      next(error);
    } else {
      res.json(results);
    }
  });
});

//12.샵 상세 조회
router.get('/:shop_id', function (req, res, next) {
  var shop_id = parseInt(req.params.shop_id);
  var userId = 0;
  if (req.isAuthenticated()) {
    if (req.user.nickname === undefined) {
      userId = req.user.id;
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

    function selectShopPick(cb) {
      var shop_pick_sql = "select s.id as shop_id ,s.name as shopName, s.address,s.longitude, " +
        "                         s.latitude, s.callnumber, s.usetime " +
        "                  from shop s " +
        "                  where s.id=? ";
      connection.query(shop_pick_sql, [shop_id], function (err, shopPickResults) {
        if (err) {
          connection.release();
          cb(err);
        } else {
          if (shopPickResults.length === 0) {
            connection.release();
            cb(new Error('해당 샵은 존재하지 않습니다'));
          } else {
            cb(null, shopPickResults);
          }
        }
      });
    }

    function selectShopPickPhoto(shopPickResults, cb) {
      var shop_pick_photo_sql = "select pd.path as photoURL " +
        "                        from photo_datas pd " +
        "                        where pd.from_type = 1 and pd.from_id =?";
      connection.query(shop_pick_photo_sql, shop_id, function (err, shopPhotoResults) {
        if (err) {
          connection.release();
          cb(err);
        } else {
          if (shopPhotoResults.length) {
            var shop_photo_URL = [];
            async.eachSeries(shopPhotoResults, function (urlValue, cb2) {
              shop_photo_URL.push(urlValue.photoURL);
              cb2(null);
            }, function (err) {
              if (err) {
                connection.release();
                cb(err);
              } else {
                shopPickResults.photoURL = shop_photo_URL;
                cb(null, shopPickResults);
              }
            });
          } else {
            shopPickResults.photoURL = null;
            cb(null, shopPickResults);
          }
        }
      });
    }

    function selectShopPickArtists(shopPickResults, cb) {

      var shop_pick_artists_sql = "select a.id as artist_id, a.nickname as artistNickname, ifnull(ja.artist_jjim_counts, 0) as artistjjim_counts, " +
        "                                 a.intro , pd.path as artistProfilePhoto " +
        "                          from artist a left join(select artist_id, count(customer_id) as artist_jjim_counts " +
        "                                                  from jjim_artists " +
        "                                                  group by artist_id) ja " +
        "                                        on (ja.artist_id = a.id) " +
        "                                        left join (select from_id, path " +
        "                                                   from photo_datas " +
        "                                                   where from_type = 2 " +
        "                                                   group by from_id) pd " +
        "                                        on (pd.from_id = a.id)" +
        "                          where a.shop_id = ?";

      connection.query(shop_pick_artists_sql, shop_id, function (err, shopInArtistResults) {
        if (err) {
          connection.release();
          cb(err);
        } else {
          shopPickResults.attArtists = shopInArtistResults;
          cb(null, shopPickResults);
        }
      });
    }

    function selectShopPickJJimStatus(shopPickResults, cb) {
      var shop_customer_jjim_sql = "select customer_id, shop_id " +
        "                           from jjim_shops " +
        "                           where customer_id =? and shop_id =? ";
      connection.query(shop_customer_jjim_sql, [userId, shop_id], function (err, customerJJimResult) {
        connection.release();
        if (err) {
          cb(err);
        } else {
          shopPickResults[0].jjim_status = (customerJJimResult.length !== 0) ? 1 : 0;
          cb(null, shopPickResults);
        }
      });
    }

    async.waterfall([selectShopPick, selectShopPickPhoto, selectShopPickArtists, selectShopPickJJimStatus], function (err, shop_pick_results) {
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
        "shop_id": shop_pick_results[0].shop_id,
        "shopName": shop_pick_results[0].shopName,
        "address": shop_pick_results[0].address,
        "jjim_status": shop_pick_results[0].jjim_status,
        "longitude": shop_pick_results[0].longitude,
        "latitude": shop_pick_results[0].latitude,
        "callnumber": shop_pick_results[0].callnumber,
        "usetime": shop_pick_results[0].usetime,
        "shopPhotos": shop_pick_results.photoURL,
        "attArtists": shop_pick_results.attArtists
      }
    };
    callback(null, result);
  }

  async.waterfall([getConnection, selectPickShopDetails, resultJSON], function (err, result) {
    if (err) {
      var error = new Error('해당 샵의 페이지에  조회에 에러가 발생 했습니다.');
      error.statusCode = -112;
      next(error);
    } else {
      res.json(result);
    }
  });
});

module.exports = router;