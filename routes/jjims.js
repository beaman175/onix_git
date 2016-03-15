var express = require('express');
var router = express.Router();
var async = require('async');

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인 하셔야 됩니다...');
    err.status = 401;
    next(err);
  } else {
    next();
  }
}

//7.찜조회
router.get('/', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {

    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page;
    var listPerPage = 10;
    var userId = req.user.id;

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function selectUserJJim(connection, callback) {
      var pageArr = [userId, listPerPage, (page - 1) * listPerPage];
      var selectShopJJimSql = "select s.id as shop_id, s.name as shopName, s.longitude, s.latitude, pd.mainPhoto " +
        "                      from jjim_shops js join (select id, name, longitude, latitude " +
        "                                               from shop) s " +
        "                                         on (js.shop_id = s.id) " +
        "                                         left join (select from_id, path as mainPhoto " +
        "                                                    from photo_datas " +
        "                                                    where from_type = 1 " +
        "                                                    group by from_id) pd " +
        "                                         on (pd.from_id = s.id) " +
        "                      where js.customer_id =? " +
        "                      LIMIT ? OFFSET ?";

      var selectArtistJJimSql = "select a.id as artist_id, a.nickname as artistNickname, a.discount, pd.mainPhoto " +
        "                        from jjim_artists ja join (select id, nickname, discount " +
        "                                                   from artist) a " +
        "                                             on (a.id = ja.artist_id) " +
        "                                             left join (select from_id, path as mainPhoto " +
        "                                                        from photo_datas " +
        "                                                        where from_type = 3 " +
        "                                                        group by from_id) pd " +
        "                                             on (pd.from_id = a.id) " +
        "                        where ja.customer_id = ? " +
        "                        LIMIT ? OFFSET ?";

      async.waterfall([function (cb) {
        connection.query(selectShopJJimSql, pageArr, function (err, jjimShopResults) {
          if (err) {
            connection.release();
            cb(err);
          } else {
            cb(null, jjimShopResults);
          }
        });
      }, function (jjimShopResults, cb) {
        connection.query(selectArtistJJimSql, pageArr, function (err, jjimArtistResults) {
          connection.release();
          if (err) {
            cb(err);
          } else {
            cb(null, jjimArtistResults, jjimShopResults);
          }
        });
      }, function (jjimArtistResults, jjimShopResults, cb) {
        var results = {
          "successResult": {
            "message": "찜목록 보기를 조회하였습니다",
            "page": page,
            "listPerPage": listPerPage,
            "artistsList": jjimArtistResults,
            "shopsList": jjimShopResults
          }
        };
        cb(null, results);

      }], function (err, results) {
        if (err) {
          callback(err);
        } else {
          callback(null, results);
        }
      });
    }

    async.waterfall([getConnection, selectUserJJim], function (err, results) {
      if (err) {
        var error = new Error('찜목록을 조회 할 수 없습니다.');
        error.statusCode = -107;
        next(error);
      } else {
        res.json(results);
      }
    });
  } else {
    next(new Error('아티스트는 찜목록 조회를 할 수 없습니다'));
  }
});

//9.찜하기
router.post('/:target_id/plus', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {
    var target_id = req.params.target_id;
    var target = parseInt(req.body.target); //2(아티스트), 3(shop) (필수사항)
    var userId = req.user.id;


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
      connection.query(jjim_sql, [userId, target_id], function (err) {
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

    async.waterfall([getConnection, insertJJim], function (err, result) {
      if (err) {
        var error = new Error('찜하기에 에러가 발생하였습니다.');
        error.statusCode = -109;
        next(error);
      } else {
        res.json(result);
      }
    });
  } else {
    next(new Error('아티스트는 찜하기를 할 수 없습니다'));
  }

});

//10.찜삭제
router.delete('/:target_id/minus', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {
    var target_id = req.params.target_id;
    var target = parseInt(req.body.target); //2(아티스트), 3(shop) (필수사항)
    var userId = req.user.id;

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function deleteJJim(connection, callback) {
      if (target === 2) {
        var jjim_sql = "delete from jjim_artists where customer_id=? and artist_id=? ";
      } else {
        var jjim_sql = "delete from jjim_shops where customer_id=? and shop_id=? ";
      }
      connection.query(jjim_sql, [userId, target_id], function (err) {
        connection.release();
        if (err) {
          callback(err);
        } else {
          var result = {
            "successResult": {
              "message": "해당 찜이 삭제 되었습니다"
            }
          };
          callback(null, result);
        }
      });
    }

    async.waterfall([getConnection, deleteJJim], function (err, result) {
      if (err) {
        var error = new Error('찜삭제 하는 도중에 에러가 발생하였습니다.');
        error.statusCode = -110;
        next(error);
      } else {
        res.json(result);
      }
    });
  } else {
    next(new Error('아티스트는 찜삭제를 할 수 없습니다'));
  }
});

module.exports = router;