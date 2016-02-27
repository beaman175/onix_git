var express = require('express');
var router = express.Router();
var async = require('async');
//2. 아티스트 닉네임 조회
router.get('/me', function (req, res, next) {

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }
    function selectArtistNickname(connection, callback){
        var artistNicknamesql = "select ifnull(nickname, '닉네임이 아직 설정 되지 않았습니다') as nickname "+
                               "from artist " +
                               "where id = ? ";
        connection.query(artistNicknamesql, 1, function (err, artistNicknameResult){
            connection.release();
            if(err){
                callback(err);
            }else{
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
            next(err);
        } else {
            res.json(result);
        }
    });
});
//3.아티스트 닉네임 설정
router.put('/me', function (req, res, next) {
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
    function updateArtistNickname(connection, callback){
        var artistNicknamesql = "update artist set nickname = ? "+
                                "where id =?";
        connection.query(artistNicknamesql, [nickname,1], function (err, artistNicknameResult){
            connection.release();
            if(err){
                callback(err);
            }else{
                callback(null, artistNicknameResult);
            }
        });
    }
    function resultJSON(artistNicknameResult, callback) {
        var result = {
            "successResult": {
                "message": "닉네임이 정상적으로 등록 되었습니다"
            }
        };
        callback(null, result);
    }
    async.waterfall([getConnection, updateArtistNickname, resultJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });
});

//12. 아티스트 정보조회
router.get('/', function (req, res, next) {
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page; //타입검사 NaN은 타입을 비교 불가

    var idx = 0; //인덱스
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

    //아티스트 목록을 select
    function selectArtists(connection, callback) {

        var artist_sql = "select a.id, a.nickname, ifnull(ja.artist_jjim_counts, 0) as artist_jjim_counts, "+
                                 "a.discount, intro, a.shop_id "+
                          "from artist a left join (select artist_id, count(customer_id) as artist_jjim_counts "+
                                                   "from jjim_artists "+
                                                   "group by artist_id)ja "+
                                         "on (ja.artist_id = a.id) ";
        if(search != undefined){
            var finding = "where a.nickname like " + '"%'+search+'%"';
            artist_sql += finding;
        }else if(condition==='추천순'){
            var referrals = " order by artist_jjim_counts desc"; // 추천순
            artist_sql += referrals;
        }else if (condition==='할인순') {
            var referrals = " order by a.discount desc"; // 할인순
            artist_sql += referrals;
        }
        artist_sql += " LIMIT ? OFFSET ?";

        var pageArr = [listPerPage, (page - 1) * listPerPage];

        connection.query(artist_sql, pageArr, function (err, artist_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, artist_results);
            }
        });
    }

    //아티스트 사진, 서비스, 댓글들을 가져온다
    function selectArtistsDetail(connection, artist_results, callback) {
        idx = 0;
        async.eachSeries(artist_results, function (item, cb) {
            var artist_photo_sql = "select concat(pd.path,'/',pd.photoname,file_type) as photoURL " +
                                   "from photo_datas pd " +
                                   "where pd.from_type ='아티스트' and pd.from_id =?";

            var artsit_services_sql = "select sv.service_type, sv.price "+
                                      "from artist a join (select service_type, price ,artist_id " +
                                                          "from services) sv "+
                                                    "on (sv.artist_id = a.id) " +
                                      "where a.id = ?" ;

            var artist_comments = "select writer, register_date, content, artist_id " +
                                  "from artist_comments ac "+
                                  "where ac.artist_id= ? " +
                                   "limit 10 offset 0";


            async.series([function (cb2) {
                connection.query(artist_photo_sql, item.id, function (err, artist_photo_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        artist_results[idx].artistPhotos = artist_photo_results;
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(artsit_services_sql, item.id, function (err, artist_services_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        artist_results[idx].services = artist_services_results;
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(artist_comments, item.id, function (err, artist_comments_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        artist_results[idx].comments = artist_comments_results;
                        cb2(null);
                    }
                });
            }], function (err) {
                if(err){
                    cb(err);
                }else{
                    idx++;
                    cb(null);
                }
            });

        }, function (err) {
            if (err) {
                callback(err);
            } else {
                connection.release();
                callback(null, artist_results);
            }
        });
    }

    //JSON 객체 생성
    function resultJSON(artist_results, callback) {
        var artistList = [];

        async.eachSeries(artist_results, function (item, cb) {
            var artist_element = {
                "artistsList": [{
                    "artist_id": item.id,
                    "name": item.nickname,
                    "artist_jjim_counts": item.artist_jjim_counts,
                    "discount": item.discount,
                    "intro" : item.intro,
                    "jjim_status": "보류",
                    "shop_id": item.shop_id,
                    "artistPhotos": item.artistPhotos,
                    "services": item.services,
                    "comments": item.comments
                }]
            };
            artistList.push(artist_element);
            cb(null);
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                var artist_results = {
                    "successResult": {
                        "message": "모든 아티스트들이 정상적으로 조회 되었습니다.",
                        "page": page,
                        "listPerPage": listPerPage,
                        "artistsList": artistList
                    }
                };
                callback(null, artist_results);
            }
        });
    }
    async.waterfall([getConnection, selectArtists, selectArtistsDetail, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
        }
    });
});


// 13.아티스트 상세조회
router.get('/:artist_id', function (req, res, next) {
    var artist_id = parseInt(req.params.artist_id);

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
        var artist_pick_sql = "select id, nickname, discount,intro, shop_id "+
                              "from artist "+
                              "where id=?";

        var artist_pick_photo_sql = "select concat(pd.path,'/',pd.photoname,file_type) as photoURL " +
                                    "from photo_datas pd " +
                                    "where pd.from_type ='아티스트' and pd.from_id =?";

        var artsit_pick_services_sql = "select sv.service_type, sv.price "+
                                       "from artist a join (select service_type, price ,artist_id " +
                                                           "from services) sv "+
                                                     "on (sv.artist_id = a.id) " +
                                       "where a.id = ?" ;

        var artist_pick_comments = "select writer, register_date, content " +
                                   "from artist_comments ac "+
                                   "where ac.artist_id= ? " +
                                   "limit 10 offset 0";


        async.waterfall([function (cb) {
            connection.query(artist_pick_sql, artist_id, function (err, artist_pick_results) {
                if (err) {
                    cb(err);
                } else {
                    cb(null,artist_pick_results);
                }
            });
        }, function (artist_pick_results,cb) {
            connection.query(artist_pick_photo_sql, artist_id, function (err, artist_photo_results) {
                if (err) {
                    cb(err);
                } else {
                    artist_pick_results.artistPhotos = artist_photo_results;
                    cb(null,artist_pick_results);
                }
            });
        }, function (artist_pick_results,cb) {
            connection.query(artsit_pick_services_sql, artist_id, function (err, artist_services_results) {
                if (err) {
                    cb(err);
                } else {
                    artist_pick_results.services = artist_services_results;
                    cb(null,artist_pick_results);
                }
            });
        }, function (artist_pick_results,cb) {
            connection.query(artist_pick_comments,artist_id, function (err, artist_comments_results) {
                if (err) {
                    cb2(err);
                } else {
                    artist_pick_results.comments = artist_comments_results;
                    cb(null, artist_pick_results);
                }
            });
        }], function (err,artist_pick_results) {
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
                "artist_id": artist_pick_results[0].id,
                "nickname": artist_pick_results[0].nickname,
                "discount": artist_pick_results[0].discount,
                "intro": artist_pick_results[0].intro,
                "jjim_status": "보류",
                "shop_id": artist_pick_results[0].shop_id,
                "artistPhotos": artist_pick_results.artistPhotos,
                "services": artist_pick_results.services,
                "comments": artist_pick_results.comments
            }
        };
        callback(null,result);
    }
    async.waterfall([getConnection, selectArtistsDetail, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
        }
    });
});




// 14.한줄평 더보기
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

    function selectArtistComments(connection, callback){
        var artistCommentsql = "select writer, register_date, content "+
                               "from artist_comments ac "+
                               "where ac.artist_id=? "+
                               "limit ? offset ? ";
        var pageArr = [artist_id, listPerPage, (commentpage - 1) * listPerPage];
        connection.query(artistCommentsql, pageArr, function (err, artistCommentResult){
            connection.release();
            if(err){
                callback(err);
            }else{
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
                next(err);
            } else {
                res.json(results);
            }
    });
});


// 15.아티스트 한줄평 쓰기
router.post('/:artist_id/comments', function (req, res, next) {
    var artist_id = req.params.artist_id;
    var content = req.body.content;
    var result = {
        "successResult": {
            "message": "댓글이 정상적으로 게시 되었습니다."
        }
    };
    res.json(result);
});
module.exports = router;