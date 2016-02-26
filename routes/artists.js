var express = require('express');
var router = express.Router();
var async = require('async');
//2.아티스트 닉네임 설정
router.put('/me', function (req, res, next) {
    var nickname = req.body.nickname;
    var result = {
        "successResult": {
            "message": "닉네임이 정상적으로 등록 되었습니다"
        }
    };
    res.json(result);
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
                                 "a.discount, a.shop_id "+
                          "from artist a left join (select artist_id, count(customer_id) as artist_jjim_counts "+
                                                   "from jjim_artists "+
                                                   "group by artist_id)ja "+
                                        "on (ja.artist_id = a.id) ";
        if(search != undefined){
            var finding = "where a.nickname like " + '"%'+search+'%"';
            console.log(finding);
            artist_sql += finding
            artist_sql += " LIMIT ? OFFSET ?";
        }else if(condition==='추천순'){
            var referrals = " order by artist_jjim_counts desc"; // 추천순
            artist_sql += referrals;
            artist_sql += " LIMIT ? OFFSET ?";
        }else if (condition==='할인순') {
            var referrals = " order by a.discount desc"; // 할인순
            artist_sql += referrals;
        }
        var pageArr = [listPerPage, (page - 1) * listPerPage];

        connection.query(artist_sql, pageArr, function (err, artist_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, artist_results);
            }
        });
    }

    //아티스트 사진을 가져온다
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
                        artist_results[idx].commentsList = artist_comments_results;
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

        async.forEach(artist_results, function (item, cb) {
            var artist_element = {
                "artistsList": [{
                    "artist_id": item.id,
                    "name": item.nickname,
                    "jjimcount_count": item.artist_jjim_counts,
                    "discount": item.discount,
                    "jjim_status": "보류",
                    "shop_id": item.shop_id,
                    "artistPhotos": item.artistPhotos,
                    "services": item.services,
                    "comments": {
                        "commentPage": 1,
                        "listPerPage": 10,
                        "commentsList": [{
                            "date": "2015-01-12 14:00", "writer": "abcd@example.onix.com",
                            "content": "너무 잘해주세요~"
                        }, {
                            "date": "2015-01-12 16:00", "writer": " dhy123@example.onix.com",
                            "content": "친절하세요~"
                        }]
                    }
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
router.get('/:artist_id/details', function (req, res, next) {
    var artist_id = req.params.artist_id;

    var result = {
        "successResult": {
            "message": "해당 아티스트 페이지 입니다",
            "artist_id": 2,
            "name": "네일이염",
            "jjimcount_count": "찜목록 수",
            "discount": 20,
            "jjim_status": "찜상태",
            "shop_id": 1,
            "artistPhotos": [{"photoURL": "./public/photos/artist/xxxxxx3.jpg"}, {"photoURL": "./public/photos/artist/xxxxxx8.jpg"}],
            "services": [{"type": "젤네일", "price": 10000}, {"type": "젤페디", "price": 20000}],
            "comments": {
                "commentPage": 1,
                "listPerPage": 10,
                "commentsList": [{
                    "date": "2016-01-12 14:00", "writer": "abcd@example.onix.com",
                    "content": "너무 잘해주세요~"
                }, {
                    "date": "2016-01-12 16:00", "writer": " dhy123@example.onix.com",
                    "content": "친절하세요~"
                }]
            }
        }
    };
    res.json(result);
});

// 14.한줄평 더보기
router.get('/:artist_id/comments', function (req, res, next) {
    var artist_id = req.params.artist_id;
    var commentpage = req.query.commentpage;

    var result = {
        "successResult": {
            "message": "한줄평을 추가로 불러왔습니다.",
            "commentpage": commentpage,
            "listPerPage": 10,
            "comments": [{
                "date": "2016-01-12 14:00", "writer": "abcd@example.onix.com",
                "content": "너무 잘해주세요~"
            }, {
                "date": "2016-01-12 16:00", "writer": " dhy123@example.onix.com",
                "content": "친절하세요~"
            }]
        }
    };
    res.json(result);

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