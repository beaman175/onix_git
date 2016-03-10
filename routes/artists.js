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

//2. 아티스트 닉네임 조회
router.get('/me', isLoggedIn, function (req, res, next) {
  if (req.secure) {
    if (req.isAuthenticated()) {
      var artist_id = req.user.id;
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

    function selectArtistNickname(connection, callback) {
      var artistNicknamesql = "select ifnull(nickname, '닉네임이 아직 설정 되지 않았습니다') as nickname " +
        "from artist " +
        "where id = ? ";
      connection.query(artistNicknamesql, artist_id, function (err, artistNicknameResult) {
        connection.release();
        if (err) {
          callback(err);
        } else {
          callback(null, artistNicknameResult);
        }
      });
    }

    function resultJSON(artistNicknameResult, callback) {
      var result = {
        "successResult": {
          "message": "닉네임이 정상적으로 조회 되었습니다",
          "nickname": artistNicknameResult[0].nickname
        }
      };
      callback(null, result);
    }

    async.waterfall([getConnection, selectArtistNickname, resultJSON], function (err, result) {
      if (err) {
        var err = new Error('닉네임 조회를 하지 못하였습니다.');
        err.statusCode = -102;
        next(err);
      } else {
        res.json(result);
      }
    });
  } else {
    var err = new Error('SSL/TLS Upgrade Required');
    err.status = 426;
    next(err);
  }
});

//3.아티스트 닉네임 설정
router.put('/me', isLoggedIn, function (req, res, next) {
  if (req.seruce) {
    if (req.isAuthenticated()) {
      var artist_id = req.user.id;
    }
    var nickname = req.body.nickname;

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function updateArtistNickname(connection, callback) {

      var artistNicknamesql = "update artist set nickname = ? " +
        "where id =?";
      connection.query(artistNicknamesql, [nickname, artist_id], function (err, artistNicknameResult) {
        connection.release();
        if (err) {
          callback(err);
        } else {
          if (artistNicknameResult.affectedRows === 0) {
            callback(err);
          } else {
            var result = {
              "successResult": {
                "message": "닉네임이 정상적으로 등록 되었습니다"
              }
            };
            callback(null, result);
          }
        }
      });
    }

    async.waterfall([getConnection, updateArtistNickname], function (err, result) {
      if (err) {
        var err = new Error('닉네임 설정을 하지 못하였습니다.');
        err.statusCode = -103;
        next(err);
      } else {
        res.json(result);
      }
    });
  } else {
    var err = new Error('SSL/TLS Upgrade Required');
    err.status = 426;
    next(err);
  }

});

//13. 아티스트 목록 조회
router.get('/', function (req, res, next) {
  var page = parseInt(req.query.page);
  page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

  var listPerPage = 10;

  var condition = req.query.condition; //거리순, 추천순
  var search = req.query.search; // 검색

  var idx = 0;
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

  //아티스트 목록을 select
  function selectArtists(connection, callback) {

    var artist_sql = "select a.id as artist_id, a.nickname as artistNickname, ifnull(ja.artist_jjim_counts, 0) as artist_jjim_counts, " +
      "                      a.discount, pd.mainPhoto " +
      "               from artist a left join (select artist_id, count(customer_id) as artist_jjim_counts " +
      "                                        from jjim_artists " +
      "                                        group by artist_id)ja " +
      "                             on (ja.artist_id = a.id) " +
      "                             left join (select from_id, path as mainPhoto " +
      "                                        from photo_datas " +
      "                                        where from_type ='아티스트' " +
      "                                        group by from_id) pd " +
      "                             on (a.id = pd.from_id) ";

    if (search != undefined) {
      var finding = "where a.nickname like " + '"%' + search + '%"';
      artist_sql += finding;
    } else if (condition === '추천순') {
      var referrals = " order by artist_jjim_counts desc"; // 추천순
      artist_sql += referrals;
    } else if (condition === '할인순') {
      var referrals = " order by a.discount desc"; // 할인순
      artist_sql += referrals;
    }
    artist_sql += " LIMIT ? OFFSET ?";

    var pageArr = [listPerPage, (page - 1) * listPerPage];

    connection.query(artist_sql, pageArr, function (err, artist_results) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null, artist_results);
      }
    });
  }

  //JSON 객체 생성
  function resultJSON(artist_results, callback) {
    var artist_results = {
      "successResult": {
        "message": "모든 아티스트들이 정상적으로 조회 되었습니다.",
        "page": page,
        "listPerPage": listPerPage,
        "artistList": artist_results
      }
    };
    callback(null, artist_results);
  }

  async.waterfall([getConnection, selectArtists, resultJSON], function (err, results) {
    if (err) {
      var error = new Error('아티스트의 정보를 불러오기 실패하였습니다.');
      error.statusCode = -113;
      next(error);
    } else {
      res.json(results);
    }
  });
});

// 14.아티스트 상세조회
router.get('/:artist_id', function (req, res, next) {
  var artist_id = parseInt(req.params.artist_id);
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

  function selectArtistsDetail(connection, callback) {

    function selectArtistPick(cb) {
      var artist_pick_sql = "select a.id as artist_id, a.nickname as artistNickname, " +
        "                           a.discount, a.intro, a.shop_id, s.shopName, pd.path as artistProfilePhoto " +
        "                    from artist a left join (select from_id, path " +
        "                                             from photo_datas " +
        "                                             where from_type ='프로필' " +
        "                                             group by from_id) pd " +
        "                                  on (a.id = pd.from_id) " +
        "                                  left join (select id, name as shopName " +
        "                                            from shop) s " +
        "                                  on (a.shop_id = s.id)  " +
        "                    where a.id = ?";
      connection.query(artist_pick_sql, [artist_id], function (err, artist_pick_results) {
        if (err) {
          cb(err);
        } else {
          if (artist_pick_results.length === 0) {
            cb(new Error('해당 아티스트는 존재하지 않습니다'));
          } else {
            cb(null, artist_pick_results);
          }
        }
      });
    }

    function selectArtistPickPhoto(artist_pick_results, cb) {
      var artist_pick_photo_sql = "select path as photoURL " +
        "                          from photo_datas  " +
        "                          where from_type ='아티스트' and from_id =?";

      connection.query(artist_pick_photo_sql, artist_id, function (err, artist_photo_results) {
        if (err) {
          cb(err);
        } else {
          var artist_photo_URL = [];
          async.eachSeries(artist_photo_results, function (urlValue, cb2) {
            artist_photo_URL.push(urlValue.photoURL);
            cb2(null);
          }, function (err) {
            if (err) {
              cb(err);
            } else {
              artist_pick_results.artistPhotos = artist_photo_URL;
              cb(null, artist_pick_results);
            }
          });

        }
      });
    }

    function selectArtistPickService(artist_pick_results, cb) {
      var artsit_pick_services_sql = "select sv.service_type, sv.price " +
        "                             from artist a left join (select service_type, price ,artist_id " +
        "                                                 from services) sv " +
        "                                           on (sv.artist_id = a.id) " +
        "                             where a.id = ?";
      connection.query(artsit_pick_services_sql, artist_id, function (err, artist_services_results) {
        if (err) {
          cb(err);
        } else {
          artist_pick_results.services = artist_services_results;
          cb(null, artist_pick_results);
        }
      });
    }

    function selectArtistPickComments(artist_pick_results, cb) {
      var artist_pick_comments = "select writer_id, writer, date_format(convert_tz(register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
        "                                as 'register_date', content " +
        "                         from artist_comments " +
        "                         where artist_id= ? " +
        "                         limit 10 offset 0";
      connection.query(artist_pick_comments, artist_id, function (err, artist_comments_results) {
        if (err) {
          cb(err);
        } else {
          artist_pick_results.comments = artist_comments_results;
          cb(null, artist_pick_results);
        }
      });
    }

    function selectArtistPickJJimStatus(artist_pick_results, cb) {
      var artist_customer_jjim_status_sql = "select customer_id, artist_id " +
        "                                    from jjim_artists " +
        "                                    where customer_id =? and artist_id =?";
      connection.query(artist_customer_jjim_status_sql, [userId, artist_id], function (err, artist_comments_results) {
        if (err) {
          cb(err);
        } else {
          artist_pick_results[0].jjim_status = (artist_comments_results.length !== 0) ? 1 : 0;
          cb(null, artist_pick_results);
        }
      });
    }

    async.waterfall([selectArtistPick, selectArtistPickPhoto, selectArtistPickService, selectArtistPickComments, selectArtistPickJJimStatus],
      function (err, artist_pick_results) {
        if (err) {
          callback(err);
        } else {
          connection.release();
          callback(null, artist_pick_results);
        }
      });
  }

  //JSON 객체 생성
  function resultJSON(artist_pick_results, callback) {
    var result = {
      "successResult": {
        "message": "해당 아티스트 페이지 입니다",
        "artist_id": artist_pick_results[0].artist_id,
        "artistNickname": artist_pick_results[0].artistNickname,
        "discount": artist_pick_results[0].discount,
        "intro": artist_pick_results[0].intro,
        "jjim_status": artist_pick_results[0].jjim_status,
        "shop_id": artist_pick_results[0].shop_id,
        "shopName": artist_pick_results[0].shopName,
        "artistProfilePhoto": artist_pick_results[0].artistProfilePhoto,
        "artistPhotos": artist_pick_results.artistPhotos,
        "services": artist_pick_results.services,
        "comments": artist_pick_results.comments
      }
    };
    callback(null, result);
  }

  async.waterfall([getConnection, selectArtistsDetail, resultJSON], function (err, results) {
    if (err) {
      var error = new Error('해당 아티스트의 페이지에 에러가 발생하였습니다');
      error.statusCode = -114;
      next(error);
    } else {
      res.json(results);
    }
  });
});

// 15.한줄평 더보기
router.get('/:artist_id/comments', function (req, res, next) {
  var artist_id = parseInt(req.params.artist_id);
  var commentpage = parseInt(req.query.commentpage);

  commentpage = isNaN(commentpage) ? 2 : commentpage; //타입검사 NaN은 타입을 비교 불가

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

  function selectArtistComments(connection, callback) {
    var artistCommentsql = "select writer_id, writer, date_format(convert_tz(register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
      "                            as register_date, content " +
      "                     from artist_comments " +
      "                     where artist_id=? " +
      "                     limit ? offset ? ";
    var pageArr = [artist_id, listPerPage, (commentpage - 1) * listPerPage];
    connection.query(artistCommentsql, pageArr, function (err, artistCommentResult) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null, artistCommentResult);
      }
    });
  }

  function resultJSON(artistCommentResult, callback) {
    var result = {
      "successResult": {
        "message": "한줄평을 추가로 불러왔습니다.",
        "commentpage": commentpage,
        "listPerPage": 10,
        "comments": artistCommentResult
      }
    };
    callback(null, result);
  }

  async.waterfall([getConnection, selectArtistComments, resultJSON], function (err, results) {
    if (err) {
      var error = new Error('한줄평 더보기에 에러가 발생하였습니다.');
      error.statusCode = -115;
      next(error);
    } else {
      res.json(results);
    }
  });
});

// 16.아티스트 한줄평 쓰기
router.post('/:artist_id/comments', isLoggedIn, function (req, res, next) {
  if (req.user.nickname === undefined) {
    var artist_id = req.params.artist_id;
    var content = req.body.content;

    var writer_id = req.user.id;
    var writer = req.user.email_id.substring(0, (req.user.email_id.indexOf('@') - 3)).concat('***');
    var writeInfo = [writer_id, writer, content, artist_id];

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function insertComment(connection, callback) {
      var insertCommentSql = "insert into artist_comments(writer_id, writer, content, artist_id) " +
        "                     values(?,?,?,?);";

      connection.query(insertCommentSql, writeInfo, function (err) {
        if (err) {
          var err = new Error('한줄평 쓰기에 실패했습니다.');
          err.statusCode = -116;
          callback(err);
        } else {
          callback(null);
        }
      });
    }

    async.waterfall([getConnection, insertComment], function (err) {
      if (err) {
        var error = new Error('한줄평 쓰기에 실패했습니다.');
        error.statusCode = -116;
        next(error);
      } else {
        var result = {
          "successResult": {
            "message": "한줄평이 정상적으로 등록되었습니다."
          }
        };
        res.json(result);
      }
    });
  } else {
    var err = new Error('아티스트는 한줄평을 쓸 수 없습니다');
    next(err);
  }
});


module.exports = router;