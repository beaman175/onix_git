var express = require('express');
var router = express.Router();

//3.로컬로그인
router.post('/local', function (req, res, next) {
    if (req.secure) {
        var email_id = req.body.email_id; //고객,아티스트 id
        var password = req.body.password; // 비밀번호
        var registration_token = req.body.registration_token; //고객 푸시 토큰
        var user_type = req.body.user_type; // 로그인 타입( 고객: 1, 아티스트: 2)

        var result = {
            "successResult": {
                "message": "로그인 되셨습니다"
            }
        };
        res.json(result);
    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!');
        err.status = 426;
        next(err);
    }
});

//4.페이스북로그인
router.post('/facebook', function (req, res, next) {
    if (req.secure) {
        var access_token  = req.body.access_token; // 비밀번호
        var registration_token = req.body.registration_token; //고객 푸시 토큰

        var result = {
            "successResult": {
                "message": "로그인 되셨습니다"
            }
        };
        res.json(result);
    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!');
        err.status = 426;
        next(err);
    }
});

module.exports = router;