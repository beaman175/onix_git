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

// 16.게시판 조회
router.get('/:postBoard_id/posts', function (req, res, next) {

    var idx = 0; //인덱스
    var listPerPage = 10;

    var postBoard_id = parseInt(req.params.postBoard_id); //1(QnA), 2(커뮤니티), 3(공지사항)
    postBoard_id = (postBoard_id>3 || postBoard_id<0) ? 1: postBoard_id;

    if(postBoard_id === 3){
       var boardName = '공지사항';
    } else if(postBoard_id === 2){
        var boardName = '커뮤니티';
    } else{
        var boardName = 'QnA';
    }

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
        var boards_sql =  "select pbd.id as board_id, p.id, p.writer_id, p.writer, "+
                                 "date_format(convert_tz(p.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') as 'register_date', " +
                                 "p.title, p.content " +
                          "from postboard pbd join (select id, postboard_id, writer_id, writer, register_date, title, content "+
                                                   "from posts) p "+
                                             "on (p.postboard_id = pbd.id)" +
                                             "left join (select from_id, path " +
            "                                            from photo_datas " +
            "                                            where from_type ='게시판'  " +
            "                                            limiy 1,0) pd " +
            "                                 on (a.id = pd.from_id) " +
            "               where pbd.id = ? ";

        if (search != undefined) {
            var finding = "and p.title like " + '"%' + search + '%"';
            boards_sql += finding;
        }
        boards_sql += " LIMIT ? OFFSET ?";

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
    function selectBoardsDetails(connection, board_results, callback) {
        idx = 0;
        async.eachSeries(board_results, function (item, cb) {
            var boards_comments = "select writer, date_format(convert_tz(register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
                                          "as 'register_date', content " +
                                  "from reply  " +
                                  "where posts_id = ?  " +
                                  "limit 10 offset 0";
            var board_photo = "select from_id, path as photoURL "+
                              "from photo_datas " +
                              "where from_type ='게시판' and from_id= ?";

            async.series([function (cb2) {
                connection.query(boards_comments, item.id, function (err, board_replies_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        board_results[idx].replies = board_replies_results;
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(board_photo, item.id, function (err, board_photo_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        board_results[idx].photoURL = board_photo_results;
                        cb2(null);
                    }
                });
            }], function (err, result) {
                idx++;
                cb(null);
            });
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                connection.release();
                callback(null, board_results);
            }
        });
    }

    //JSON 객체 생성
    function resultJSON(board_results, callback) {
        var postList = [];
        async.eachSeries(board_results, function (item, cb) {
            var post_element = {
                        "post_id" :item.id,
                        "writer_id": item.writer_id,
                        "writer": item.writer,
                        "date": item.register_date,
                        "title": item.title,
                        "content": item.content,
                        "photo": item.photoURL,
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
                        "boardName" : boardName,
                        "postList": postList
                    }
                };
                callback(null, results);
            }
        });
    }

    async.waterfall([getConnection, selectBoards, selectBoardsDetails, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
        }
    });


});

// 17. 게시판 내 댓글 더보기
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

    function selectBoardReplies(connection, callback){
        var boardRepliessql = "select r.writer_id, r.writer, date_format(convert_tz(r.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
                                      "as 'register_date', r.content " +
                              "from reply r join postboard pb on (pb.id = r.posts_id) " +
                              "where r.posts_id= ?  and pb.id = ? " +
                              "limit ? offset ?";

        var pageArr = [post_id, postBoard_id, listPerPage, (repliespage - 1) * listPerPage];

        connection.query(boardRepliessql, pageArr, function (err, boardRepliesResult){
            connection.release();
            if(err){
                callback(err);
            }else{
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
            next(err);
        } else {
            res.json(results);
        }
    });
});

// 18. 게시판  글 쓰기
router.post('/:postBoard_id/posts', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)

    var writer_id = req.body.writer; //작성자
    var writer = req.body.writer; //작성자
    var title = req.body.title; // 제목
    var content = req.body.content; // 내용
    var photo = req.body.photo; //사진

    var result = {
        "successResult": {
            "message": "게시글이 정상적으로 게시되었습니다."
        }
    };
    res.json(result);

});

// 19.게시판 내에 댓글 쓰기
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
    function insertReply (writeInfo, connection, callback){
        var insertReplySql = "insert into reply(writer_id,writer,content,posts_id) " +
                             "values(?,?,?,?);";

        connection.query(insertReplySql, writeInfo, function (err) {
            if (err) {
                var err = new Error('댓글을 쓰기에 실패하였습니다.');
                err.statusCode = -120;
                callback(err);
            } else {
                callback(null);
            }
        });
    }

    async.waterfall([checkingUser, getConnection, insertReply], function (err) {
        if (err) {
            next(err);
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