var express = require('express');
var router = express.Router();

//5.세일 푸시 조회
router.get('/', function (req, res, next) {
    var page = req.query.page;

    var result = {
        "successResult": {
            "message": "세일 정보를 조회합니다.",
            "page": page,
            "listPerPage": 10,
            "saleList": [{
                "artist_id": "2",
                "artist_nickname": "네일짱짱맨",
                "date": "2015-01-25 13:00",
                "validdate": "오후1시부터 ~ 3시까지",
                "discount": 20
            },{
                "artist_id": "4",
                "artist_nickname": "민규짱",
                "date": "2015-01-25 14:00",
                "validdate": "오후2시부터 ~ 5시까지",
                "discount": 50
            }]
        }
    };
    res.json(result);
});

//7.세일 푸시
router.post('/', function (req, res, next) {
    var discount = req.body.discount; //할인율
    var validdate = req.body.validdate; //유효기간
    var result = {
        "successResult": {
            "message": "세일 메시지를 전송하였습니다"
        }
    };
    res.json(result)
});


module.exports = router;