var express = require('express');
var router = express.Router();
var async = require('async');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var path = require('path');
var s3Config = require('../config/s3config');
var fs = require('fs');
var mime = require('mime');

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인 하셔야 됩니다...');
    err.status = 401;
    next(err);
  } else {
    next();
  }
}

// 17.게시판 조회
router.get('/:postBoard_id/posts', function (req, res, next) {

  var idx = 0; //인덱스
  var listPerPage = 10;

  var postBoard_id = parseInt(req.params.postBoard_id); //1(QnA), 2(커뮤니티), 3(공지사항)
  postBoard_id = (postBoard_id > 3 || postBoard_id < 0) ? 1 : postBoard_id;

  var page = req.query.page;
  page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

  var search = req.query.search;

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  //게시글 목록을 select
  function selectBoards(connection, callback) {
    var boards_sql = "select pbd.name as boardName, p.id as post_id, p.writer_id, p.writer, " +
      "                        date_format(CONVERT_TZ(p.register_date, '+00:00', '+9:00'), '%Y-%m-%d %H:%i:%s') as register_date, " +
      "                        pd.path as boardPhoto, p.title, p.content " +
      "                 from postboard pbd join (select id, postboard_id, writer_id, writer, register_date, title, content " +
      "                                          from posts) p " +
      "                                    on (p.postboard_id = pbd.id) " +
      "                                    left join (select from_id, path " +
      "                                               from photo_datas " +
      "                                               where from_type = 4 " +
      "                                               group by from_id) pd " +
      "                                    on (p.id = pd.from_id) " +
      "                 where pbd.id = ? ";

    if (search != undefined) {
      var finding = "and p.title like " + '"%' + search + '%"';
      boards_sql += finding;
    }
    boards_sql += "order by register_date desc " +
      "LIMIT ? OFFSET ?";

    var pageArr = [postBoard_id, listPerPage, (page - 1) * listPerPage];

    connection.query(boards_sql, pageArr, function (err, board_results) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection, board_results);
      }
    });
  }

  //사진과 댓글을 불러온다
  function selectBoardsComments(connection, board_results, callback) {
    idx = 0;
    var boards_comments = "select writer_id, writer, date_format(convert_tz(register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
      "                           as register_date, content " +
      "                    from reply  " +
      "                    where posts_id = ?  " +
      "                    limit 10 offset 0";

    async.eachSeries(board_results, function (item, cb) {

      connection.query(boards_comments, item.post_id, function (err, board_replies_results) {
        if (err) {
          cb2(err);
        } else {
          board_results[idx].replies = board_replies_results;
          idx++;
          cb(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null, board_results);
      }
    });
  }

  //JSON 객체 생성
  function resultJSON(board_results, callback) {
    var postList = [];
    async.eachSeries(board_results, function (item, cb) {
      var post_element = {
        "post_id": item.post_id,
        "boardName": item.boardName,
        "writer_id": item.writer_id,
        "writer": item.writer,
        "register_date": item.register_date,
        "title": item.title,
        "content": item.content,
        "boardPhoto": item.boardPhoto,
        "replies": item.replies
      };
      postList.push(post_element);
      cb(null);
    }, function (err) {
      if (err) {
        callback(err);
      } else {
        var results = {
          "successResult": {
            "message": "해당 게시물들이 정상적으로 조회 되었습니다.",
            "page": page,
            "listPerPage": listPerPage,
            "postList": postList
          }
        };
        callback(null, results);
      }
    });
  }

  async.waterfall([getConnection, selectBoards, selectBoardsComments, resultJSON], function (err, results) {
    if (err) {
      var error = new Error('게시판의 글들을 조회 하지 못하였습니다.');
      error.statusCode = -117;
      next(error);
    } else {
      res.json(results);
    }
  });
});

// 18. 게시판 내 댓글 더보기
router.get('/:postBoard_id/posts/:post_id/replies', function (req, res, next) {
  var postBoard_id = parseInt(req.params.postBoard_id); //1(QnA), 2(커뮤니티), 3(공지사항)
  var post_id = parseInt(req.params.post_id);// 해당 게시판 글 id
  var repliespage = parseInt(req.query.repliespage);
  var listPerPage = 10;

  repliespage = isNaN(repliespage) ? 2 : repliespage; //타입검사 NaN은 타입을 비교 불가

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function selectBoardReplies(connection, callback) {
    var boardRepliessql = "select r.writer_id, r.writer, date_format(convert_tz(r.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
      "as 'register_date', r.content " +
      "from reply r join postboard pb on (pb.id = r.posts_id) " +
      "where r.posts_id= ?  and pb.id = ? " +
      "limit ? offset ?";

    var pageArr = [post_id, postBoard_id, listPerPage, (repliespage - 1) * listPerPage];

    connection.query(boardRepliessql, pageArr, function (err, boardRepliesResult) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null, boardRepliesResult);
      }
    });
  }

  function resultJSON(boardRepliesResult, callback) {
    var results = {
      "successResult": {
        "message": "댓글들을 추가로 불러왔습니다.",
        "repliespage": repliespage, //2페이지 이상
        "listPerPage": 10,
        "replies": boardRepliesResult
      }
    };
    callback(null, results);
  }

  async.waterfall([getConnection, selectBoardReplies, resultJSON], function (err, results) {
    if (err) {
      var error = new Error('댓글 더보기 중에 에러가 발생하였습니다.');
      error.statusCode = -118;
      next(error);
    } else {
      res.json(results);
    }
  });
});

// 19. 게시판  글 쓰기
router.post('/:postBoard_id/posts', isLoggedIn, function (req, res, next) {
  var postBoard_id = parseInt(req.params.postBoard_id); //1(QnA), 2(커뮤니티), 3(공지사항)

  var writer_id = req.user.id;
  if (req.user.nickname === undefined) {
    var writer = req.user.email_id.substring(0, (req.user.email_id.indexOf('@') - 3)).concat('***');
  } else {
    var writer = req.user.nickname;
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


  function insertPost(connection, callback) {
    var insertPostSql = "insert into posts (postboard_id, writer_id, writer, title, content) values (?,?,?,?,?)";
    var insertPostPhotoSql = "insert into photo_datas (from_id, from_type, origin_name, photoname, size, file_type, path) values (?,4,?,?,?,?,?)";

    var writeXform = [postBoard_id, writer_id, writer, req.body.title, req.body.content];

    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') { // 사진을 올리지 않은 경우
      connection.query(insertPostSql, writeXform, function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    }
    else {
      var form = new formidable.IncomingForm();
      form.uploadDir = path.join(__dirname, '../uploads');
      form.keepExtensions = true;
      form.multiples = true;

      form.parse(req, function (err, fields, files) {
        var writeNomalform = [postBoard_id, writer_id, writer, fields['title'], fields['content']];
        connection.beginTransaction(function (err) {

          function insertPost(cb) {
            connection.query(insertPostSql, writeNomalform, function (err, result) {
              if (err) {
                connection.rollback();
                connection.release();
                cb(err);
              } else {
                var resultId = result.insertId;
                cb(null, resultId);
              }
            });
          }

          function insertPostPhoto(resultId, cb) {
            var s3 = new AWS.S3({
              "accessKeyId": s3Config.key,
              "secretAccessKey": s3Config.secret,
              "region": s3Config.region,
              "params": {
                "Bucket": s3Config.bucket,
                "Key": s3Config.imageDir + "/" + path.basename(files.photo.path), // 목적지의 이름
                "ACL": s3Config.imageACL,
                "ContentType": mime.lookup(files.photo.path)
              }
            });

            var body = fs.createReadStream(files.photo.path);
            s3.upload({"Body": body}) //pipe역할
              .send(function (err, data) {
                if (err) {
                  s3.deleteObject();
                  connection.rollback();
                  connection.release();
                  callback(err);
                } else {
                  fs.unlink(files.photo.path, function () {
                    var value = [resultId, files.photo.name, data.key.split('/')[1], files.photo.size, files.photo.type, data.Location];
                    connection.query(insertPostPhotoSql, value, function (err) {
                      if (err) {
                        s3.deleteObject();
                        connection.rollback();
                        connection.release();
                        cb(err);
                      } else {
                        cb(null);
                      }
                    });
                  });
                }
              });
          }

          async.waterfall([insertPost, insertPostPhoto], function (err) {
            if (err) {
              callback(err);
            } else {
              connection.commit();
              connection.release();
              callback(null);
            }
          });

        });
      });
    }
  }

  async.waterfall([getConnection, insertPost], function (err) {
    if (err) {
      var error = new Error('글 게시에 실패했습니다.');
      error.statusCode = -119;
      next(error);
    } else {
      var result = {
        "successResult": {
          "message": "게시글이 정상적으로 게시되었습니다."
        }
      };
      res.json(result);
    }
  });
});


// 20.게시판 내에 댓글 쓰기
router.post('/:postBoard_id/posts/:post_id/replies', isLoggedIn, function (req, res, next) {
  var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)
  var post_id = req.params.post_id; // 해당 게시판 글 id
  var content = req.body.content; // 댓글내용

  function checkingUser(callback) {
    var writer_id = req.user.id;
    if (req.user.nickname === undefined) {
      var writer = req.user.email_id.substring(0, (req.user.email_id.indexOf('@') - 3)).concat('***');
    } else {
      var writer = req.user.nickname;
    }
    var writeInfo = [writer_id, writer, content, post_id];
    callback(null, writeInfo);
  }

  function getConnection(writeInfo, callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, writeInfo, connection);
      }
    });
  }

  function insertReply(writeInfo, connection, callback) {
    var insertReplySql = "insert into reply(writer_id,writer,content,posts_id) " +
      "values(?,?,?,?);";

    connection.query(insertReplySql, writeInfo, function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  async.waterfall([checkingUser, getConnection, insertReply], function (err) {
    if (err) {
      var error = new Error('댓글을 쓰기에 실패하였습니다.');
      error.statusCode = -120;
      next(error);
    } else {
      var result = {
        "successResult": {
          "message": "댓글이 정상적으로 등록 되었습니다."
        }
      };
      res.json(result);
    }
  });
});


module.exports = router;