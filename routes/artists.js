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
    var page = req.query.page;
    var condition = req.query.condition;
    var search = req.query.search;

    console.log(page);
    console.log(condition);
    console.log(search);

    var result = {
        "successResult": {
            "page": 1,
            "listPerPage": 10,
            "message": "아티스트들을 조회합니다.",
            "artistsList": [{
                "artist_id": 1,
                "name": "민규짱",
                "jjimcount_count": "찜목록 수",
                "discount": 20,
                "jjim_status": "찜상태",
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
            }, {
                "artist_id": 2,
                "name": "네일이염",
                "jjimcount_count": "찜목록 수",
                "discount": 20,
                "jjim_status": "찜상태",
                "shop_id": 1,
                "artistPhotos": [{"photoURL": "./public/photos/artist/xxxxx12.jpg"}, {"photoURL": "./public/photos/artist/xxxxx50.jpg"}],
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
            }]
        }
    };
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