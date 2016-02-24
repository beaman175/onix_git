var express = require('express');
var router = express.Router();
  //1.고객 로컬 회원 가입
router.post('/', function (req, res, next) {
    if (req.secure) {
        var email_id = req.body.email_id; //고객,아티스트 id
        var password = req.body.password; // 비밀번호

        var result = {
            "successResult": {
                "message": "가입이 정상적으로 처리되었습니다."
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