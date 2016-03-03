var express = require('express');
var router = express.Router();
var async = require('async');

// 16.게시판 조회
router.get('/:postBoard_id/posts', function (req, res, next) {

    var idx = 0; //인덱스
    var listPerPage = 10;

    var postBoard_id = parseInt(req.params.postBoard_id); //1(QnA), 2(커뮤니티), 3(공지사항)
    postBoard_id = (postBoard_id>3 || postBoard_id<0) ? 1: postBoard_id


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

        var boards_sql =  "select pbd.id as board_id, pbd.name ,p.id, p.writer, date_format(convert_tz(p.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
                                  "as 'register_date',, p.title, p.content, concat(pd.path,'/',pd.photoname,file_type) as photoURL " +
                          "from postboard pbd join (select id, postboard_id, writer, register_date, title, content " +
                                                    "from posts) p "+
                                             "on (p.postboard_id = pbd.id) " +
                                             "join (select from_id, path, photoname, file_type " +
                                                    "from photo_datas " +
                                                    "where from_type ='게시판') pd "+
                                             "on (p.id = pd.from_id) "+
                          "where pbd.id = ?";

        if(search != undefined){
            var finding = "where p.title like " + '"%'+search+'%"';
            console.log(finding);
            boards_sql += finding;
            boards_sql += " LIMIT ? OFFSET ?";
        }else{
            boards_sql += " LIMIT ? OFFSET ?";
        }
        var pageArr = [postBoard_id, listPerPage, (page - 1) * listPerPage];

        connection.query(boards_sql, pageArr, function (err, board_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, board_results);
            }
        });
    }

    //댓글을 불러온다
    function selectBoardsReplies(connection, board_results, callback) {
        idx = 0;
        async.eachSeries(board_results, function (item, cb) {
            var boards_comments = "select writer, date_format(convert_tz(register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
                                          "as 'register_date', content " +
                                  "from reply  " +
                                  "where posts_id = ?  " +
                                  "limit 10 offset 0";

            connection.query(boards_comments, item.id, function (err, board_replies_results) {
                if (err) {
                    cb(err);
                } else {
                    board_results[idx].replies = board_replies_results;
                    idx++;
                    cb(null);
                }
            });
        },function (err) {
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
                        "boardName" : board_results[0].name,
                        "postList": postList
                    }
                };
                callback(null, results);
            }
        });
    }

    async.waterfall([getConnection, selectBoards, selectBoardsReplies, resultJSON], function (err, results) {
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
        var boardRepliessql = "select r.writer, date_format(convert_tz(r.register_date,'+00:00','+9:00'), '%Y-%m-%d %H:%i:%s') " +
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
router.post('/:postBoard_id/posts/:post_id/replies', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)
    var post_id = req.params.post_id; // 해당 게시판 글 id
    var content = req.body.content; // 댓글내용

    var result = {
        "successResult": {
            "message": "댓글이 정상적으로 게시되었습니다."
        }
    };

    res.json(result);
});


module.exports = router;