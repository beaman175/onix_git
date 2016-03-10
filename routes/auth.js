var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var passport = require('passport');


function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인 하셔야 됩니다...');
    err.status = 401;
    next(err);
  } else {
    next();
  }
}

router.post('/logout', function(req, res, next) {
  req.logout(); //세션에서 정보를 지움
  res.json({
    "successResult": {
      "message": "로그아웃 되었습니다..."
    }
  });
});

router.get('/me', isLoggedIn, function (req, res, next) {
  if (req.secure) {
    var user = req.user;
    var result = {
      "successResult": {
        "message": "내정보를 불러왔습니다",
        "id": user.id,
        "email_id": user.email_id,
        "nickname": user.nickname
      }
    };
    res.json(result);
  } else {
    var err = new Error('SSL/TLS Upgrade Required');
    err.status = 426;
    next(err);
  }
});


//3.로컬로그인
// 로그인을 위한 미들웨어를 등록한다.
router.post('/local', function (req, res, next) {
  if (req.secure) { //req.protocol === "https" 즉 https로 통신하고 있는지 판별

    passport.authenticate('local-login', function (err, user, info) { // passport로부터 user객체 받아온다.
      if (err) {
        next(err);
      } else if (!user) { //password가 다를 때는 user에 false가 넘어온다.
        var err = new Error('암호를 확인하시기 바랍니다.');
        err.status = 401;
        next(err);
      } else {
        req.logIn(user, function (err) {
          if (err) {
            next(err);
          } else {
            var result = {
              "successResult": {
                "message": "로그인이 정상적으로 되었습니다."
              }
            };
            res.json(result);
          }
        }); // passport가 설치되면 req객체에게 logIn이라는 함수를 쓸 수 있도록 연결해준다.
      }
    })(req, res, next);
  } else {
    //https로 안 들어오고 http로 들어오면 이게 뜬다.
    var err = new Error('SSL/TLS Upgrade Required');
    err.status = 426; // upgrade required.
    next(err);
  }
});

router.post('/facebook', function(req,res,next) {
  if (req.secure) {
    passport.authenticate('facebook-token', function (err, user, info) { // passport로부터 user객체 받아온다.
      if (err) {
        next(err);
      } else {
        req.logIn(user, function (err) {
          if (err) {
            next(err);
          } else {
            var result = {
              "successResult": {
                "message": "페이스북 로그인이 정상적으로 되었습니다."
              }
            };
            res.json(result);
          }
        }); // passport가 설치되면 req객체에게 logIn이라는 함수를 쓸 수 있도록 연결해준다.
      }
    })(req, res, next);
  } else {
    var err = new Error('SSL/TLS Upgrade Required');
    err.status = 426; // upgrade required.
    next(err);
  }
});
module.exports = router;