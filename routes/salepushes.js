var express = require('express');
var router = express.Router();
var async = require('async');
var authConfig = require('../config/authconfig');
var winston = require('winston');
var winstonconfig = require('../config/winstonconfig');
var logging = new winston.Logger(winstonconfig);

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인 하셔야 됩니다...');
    err.statusCode = 401;
    next(err);
  } else {
    next();
  }
}

//6.세일 푸시 조회
router.get('/', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {
    var userId = req.user.id;

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

      var salepushSql = "select a.id as artist_id, s.id as shop_id, s.name as shopName, " +
        "                       date_format(convert_tz(sm.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') as register_date, " +
        "                       sm.validdate as validDate, a.nickname as artistNickname, a.discount, pd.path as artistProfilePhoto " +
        "                from salepushmsg sm join (select id, discount, nickname " +
        "                                          from artist) a " +
        "                                    on (a.id= sm.artist_id) " +
        "                                    join (select id, name " +
        "                                          from shop) s " +
        "                                    on (a.id= s.id) " +
        "                                    left join (select from_id, path " +
        "                                               from photo_datas " +
        "                                               where from_type = 2 " +
        "                                               group by from_id) pd " +
        "                                   on (pd.from_id = a.id) " +
        "                where sm.customer_id =?" +
        "                limit ? offset ? ";
      connection.query(salepushSql, [userId, listPerPage, (page - 1) * listPerPage], function (err, saleResults) {
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
          "artist_id": item.artist_id,
          "artistNickname": item.artistNickname,
          "artistProfilePhoto": item.artistProfilePhoto,
          "shop_id": item.shop_id,
          "shopName": item.shopName,
          "register_date": item.register_date,
          "validDate": item.validDate,
          "discount": item.discount
        };
        saleMsgResult.push(elementsSales);
        cb(null);
      }, function (err) {
        if (err) {
          callback(err);
        } else {
          logging.log('info','할인정보 조회 완료!');
          var results = {
            "successResult": {
              "message": "할인 정보를 조회합니다.",
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
        var error = new Error('할인 정보 조회에 실패하였습니다.');
        error.statusCode = -106;
        next(error);
      } else {
        res.json(results);
      }
    });
  } else {
    var err = new Error('아티스트는 할인 정보 조회를 할 수 없습니다');
    next(err);
  }
});

//8.세일 푸시
router.post('/', isLoggedIn, function (req, res, next) {

  if (req.user.nickname !== undefined) {

    var discount = parseInt(req.body.discount); //할인율
    discount = isNaN(discount) ? 0 : discount;

    var validdate = req.body.validdate; //유효기간
    var gcm = require('node-gcm');

    var artist = req.user;
    var content = '';
    content = content.concat(validdate, ' 까지 ', discount, '% 할인 진행 합니다!!');

    var message = new gcm.Message({
      collapseKey: 'demo',
      delayWhileIdle: true,
      timeToLive: 3,
      data: {
        msgId: artist.id
      },
      notification: {
        "title": artist.nickname,
        "body": content,
        "icon": "ic_launcher"
        /*"sound" : "sound"*/
      }
    });

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function pushSaleMsg(connection, callback) {

      var jjimTokenSql = "select ja.customer_id, c.registration_token " +
        "                 from jjim_artists ja join (select id, registration_token " +
        "                                            from customer) c " +
        "                                      on (c.id = ja.customer_id) " +
        "                 where ja.artist_id =? ";

      connection.query(jjimTokenSql, artist.id, function (err, tokenResults) {
        if (err) {
          connection.release();
          callback(err);
        } else {
          var regTokens = [];
          connection.beginTransaction(function (err) {
            if(err){
              connection.release();
              callback(err);
            }else{
              async.each(tokenResults, function (item, cb) {
                var insertSaleMsgSql = "insert into salepushmsg (validdate, customer_id, artist_id) " +
                  "                     values(?,?,?)";
                connection.query(insertSaleMsgSql, [validdate, item.customer_id, artist.id], function (err) {
                  if (err) {
                    connection.rollback();
                    connection.release();
                    cb(err);
                  } else {
                    regTokens.push(item.registration_token);
                    cb(null);
                  }
                });
              }, function (err) {
                if (err) {
                  connection.rollback();
                  connection.release();
                  callback(err);
                } else {
                  var updateDiscountSql = "update artist set discount = ? "+
                    "where id = ? ";
                  connection.query(updateDiscountSql, [discount, artist.id], function (err) {
                    if(err) {
                      connection.rollback();
                      connection.release();
                      callback(err);
                    } else {
                      var sender = new gcm.Sender(authConfig.gcm.server_access_key);
                      sender.send(message, regTokens, function (err) {
                        if (err) {
                          connection.rollback();
                          connection.release();
                          callback(err);
                        } else {
                          connection.commit();
                          connection.release();
                          callback(null);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    async.waterfall([getConnection, pushSaleMsg], function (err) {
      if (err) {
        var error = new Error('할인 메시지 전송 과정 중 에러가 발생하였습니다.');
        error.statusCode = -108;
        next(err);
      } else {
        console.log(message);
        var result = {
          "successResult": {
            "message": "할인 메시지를 전송하였습니다"
          }
        };
        res.json(result);
      }
    });
  } else {
    var err = new Error('고객은 할인을 전송 할 수 없습니다.');
    next(err);
  }
});


module.exports = router;