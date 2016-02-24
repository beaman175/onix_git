var express = require('express');
var router = express.Router();

// 6.찜조회
router.get('/', function (req, res, next) {
    var user_type = parseInt(req.query.user_type); //user_type :1(고객), 2(아티스트)
    var page = req.query.page;

    if (user_type === 1) { // 1(고객) 일 경우
        var result = {
            "successResult": {
                "message": "찜목록 보기를 조회하였습니다",
                "page": 1,
                "listPerPage": 10,
                "counts_artists": "찜한 아티스트 총 수",
                "counts_shops": "찜한 샵 총 수",
                "artistsList": [
                    {"artist_id": "1", "nickname": "네일해썸"},
                    {"artist_id": "2", "nickname": "네일또오"}
                ],
                "shopsList": [
                    {"shop_id": "1", "name": "오닉스샘플샵"},
                    {"shop_id": "2", "name": "루비샘플샵"},
                ]
            }
        };
        res.json(result);
    } else { // 2(아티스트) 일 경우
        var result = {
            "successResult": {
                "message": "찜목록 보기를 조회하였습니다",
                "page": 1,
                "listPerPage": 10,
                "counts_artists": "찜한 아티스트 총 수",
                "counts_shops": "찜한 샵 총 수",
                "customersList": [
                    {"customer_id": "1", "registration_id ": "abcdefg"},
                    {"customer_id": "2", "registration_id ": "xyzklnmfo"}
                ]
            }
        };
        res.json(result);
    }
});

//8.찜하기
router.post('/:target_id/plus', function (req, res, next) {
    var target_id = req.params.target_id;
    var target = req.body.target; //2(아티스트), 3(shop) (필수사항)
    var result = {
        "successResult": {
            "message": "찜이 추가 되었습니다"
        }
    };
    res.json(result);
});

//9.찜삭제
router.delete('/:target_id/minus', function (req, res, next) {
    var target_id = req.params.target_id;
    var target = req.body.target; //2(아티스트), 3(shop) (필수사항)
    var result = {
        "successResult": {
            "message": "해당 찜이 삭제 되었습니다"
        }
    };
    res.json(result);
});


module.exports = router;