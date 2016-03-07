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
//5.세일 푸시 조회
router.get('/', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {
    userId = req.user.id;
  }
  var page = parseInt(req.query.page);
  page = isNaN(page) ? 1 : page;

  var listPerPage = 10;

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function selectSalePushes(connection, callback) {
    var salepushSql = "select a.id, sm.register_date, sm.validdate, a.nickname, a.discount, pd.path as artistProfilePhoto" +
      "                from salepushmsg sm join (select id, discount,nickname " +
      "                                        from artist) a " +
      "                                  on (a.id= sm.artist_id) " +
      "                                  left join (select from_id, path " +
      "                                             from photo_datas " +
      "                                             where from_type = '프로필') pd " +
      "                                  on (pd.from_id = a.id) " +
      "                limit ? offset ? ";
    connection.query(salepushSql, [listPerPage, (page - 1) * listPerPage], function (err, saleResults) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null, saleResults);
      }
    });
  }

  function resultJSON(saleResults, callback) {
    var saleMsgResult = [];
    async.each(saleResults, function (item, cb) {
      var elementsSales = {
        "artist_id": item.id,
        "artistNickname": item.nickname,
        "artistProfilePhoto": item.artistProfilePhoto,
        "register_date": item.register_date,
        "validdate": item.validdate,
        "discount": item.discount
      };
      saleMsgResult.push(elementsSales);
      cb(null);
    }, function (err) {
      if (err) {
        callback(err);
      } else {
        var results = {
          "successResult": {
            "message": "세일 정보를 조회합니다.",
            "page": page,
            "listPerPage": 10,
            "saleList": saleMsgResult
          }
        };
        callback(null, results);
      }
    });
  }

  async.waterfall([getConnection, selectSalePushes, resultJSON], function (err, results) {
    if (err) {
      next(err);
    } else {
      res.json(results);
    }
  });
});

//7.세일 푸시
router.post('/', isLoggedIn, function (req, res, next) {
  var discount = req.body.discount; //할인율
  var validdate = req.body.validdate; //유효기간
  var result = {
    "successResult": {
      "message": "세일 메시지를 전송하였습니다"
    }
  };
  res.json(result)
});


module.exports = router;