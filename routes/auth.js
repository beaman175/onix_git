var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var passport = require('passport');

var winston = require('winston');
var winstonconfig = require('../config/winstonconfig');
var logging = new winston.Logger(winstonconfig);

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인 하셔야 됩니다...');
    err.status = 401;
    next(err);
  } else {
    next();
  }
}

//4-2 로그아웃
router.post('/logout', function (req, res, next) {
  req.logout(); //세션에서 정보를 지움
  res.json({
    "successResult": {
      "message": "로그아웃 되었습니다..."
    }
  });
});

//4.로컬 로그인
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
            var error = new Error('로그인 중 문제가 발생하였습니다.');
            error.statusCode = -104;
            next(error);
          } else {
            logging.log('info', '로그인 성공!!');
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

//5.페이스북 로그인
router.post('/facebook', function (req, res, next) {
  if (req.secure) {
    // passport로부터 user객체 받아온다.
    passport.authenticate('facebook-token', function (err, user, info) {
      if (err) {
        next(err);
      } else {
        req.logIn(user, function (err) {
          if (err) {
            var error = new Error('페이스북 연동에 문제가 생겼습니다.');
            error.statusCode = -105;
            next(error);
          } else {
            logging.log('info','페이스북 연동 성공!');
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