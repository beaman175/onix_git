var express = require('express');
var router = express.Router();

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
    function selectartists(connection, callback) {
        var referrals = "order by shop_jjim_counts desc"; // 추천순
        var finding = "where s.name = " + search;

        var artist_sql1 = "select s.id,s.name,s.address,s.longitude, s.latitude, s.callnumber, s.usetime, " +
            "ifnull(js.shop_jjim_counts,0) as shop_jjim_counts " +
            "from shop s left join (select shop_id, count(customer_id) as shop_jjim_counts " +
            "from jjim_shops " +
            "group by shop_id)js " +
            "on (js.shop_id = s.id) " +
            "LIMIT ? OFFSET ?";

        var pageArr = [listPerPage, (page - 1) * listPerPage];

        connection.query(shop_sql1, pageArr, function (err, shop_results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, shop_results);
            }
        });
    }

    //아티스트 사진을 가져온다
    function selectArtistsPhotos(connection, shop_results, callback) {
        idx = 0;
        async.forEach(shop_results, function (item, cb) {
            var shop_photo_sql = "select from_id,concat(pd.path,'/',pd.photoname,file_type) as photoURL " +
                "from photo_datas pd " +
                "where pd.from_type ='샵' and pd.from_id =?";
            connection.query(shop_photo_sql, item.id, function (err, shop_photo_results) {
                if (err) {
                    cb(err);
                } else {
                    shop_results[idx].photoURL = shop_photo_results;
                    idx++;
                    cb(null);
                }
            });
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, shop_results);
            }
        });
    }

    //JSON 객체 생성
    function resultJSON(shop_results, callback) {
        var artistList = [];

        async.forEach(shop_results, function (item, cb) {
            var artist_element = {
                "artistsList": [{
                    "artist_id": 1,
                    "name": "민규짱",
                    "jjimcount_count": "찜목록 수",
                    "discount": 20,
                    "jjim_status": "보류",
                    "shop_id": 1,
                    "artistPhotos": [{"photoURL": "./public/photos/artist/xxxxxx0.jpg"}, {"photoURL": "./public/photos/artist/xxxxx10.jpg"}],
                    "services": [{"type": "젤네일", "price": 15000}, {"type": "젤페디", "price": 25000}],
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
            shopList.push(shop_element);
            cb(null);
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                var shop_results = {
                    "successResult": {
                        "message": "모든 샵이 정상적으로 조회 되었습니다.",
                        "page": page,
                        "listPerPage": listPerPage,
                        "shopList": shopList
                    }
                };
                callback(null, shop_results);
            }
        });
    }

    async.waterfall([getConnection, selectshops, selectShopPhotos, selectShopsInArtist, resultJSON], function (err, results) {
        if (err) {
            next(err);
        } else {
            res.json(results);
        }
    });


    res.json(result);
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