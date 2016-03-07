var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var async = require('async');
var hexkey = process.env.FMS_SERVER_KEY;

module.exports = function (passport) {

  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user,done) { //요청이 있을 때마다 세션에서 id를 가져온다.
    pool.getConnection(function (err, connection) {
      if (err) {
        done(err);
      } else {
        if (user.user_type === 1) {
          var sql = "select id, convert(aes_decrypt(email_id, unhex("+ connection.escape(hexkey) +")) using utf8) as email_id " +
                    "from customer " +
                    "where id = ?";

        } else if (user.user_type === 2) {
          var sql = "select id, convert(aes_decrypt(email_id, unhex("+ connection.escape(hexkey) +")) using utf8) as email_id, " +
                               "nickname " +
                    "from artist " +
                    "where id = ?";
        }

        connection.query(sql, [user.id], function (err, results) {
          connection.release(); //주의!!!
          if (err) {
            done(err);
          } else {
            var user = {
              "id": results[0].id,
              "email_id": results[0].email_id,
              "nickname" : results[0].nickname
            };
            done(null, user);
          }
        });
      }
    });
  });

  passport.use('local-login', new LocalStrategy({ // 로그인할 때 사용하겠다
    usernameField: "email_id",//email을 id로 사용
    passwordField: "password",
    passReqToCallback: true //false일 경우 다음 함수의 req를 받지 않는다.
  }, function (req, email_id, password, done) {
    function getConnection(callback) {
      //pool에서 connection 얻어오기.
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function selectUser(connection, callback) {
      var user_type = parseInt(req.body.user_type);

      if (user_type === 1) {
        var sql = "SELECT id, email_id, password " +
          "        FROM customer " +
          "        WHERE email_id = aes_encrypt(" + connection.escape(email_id) + ",unhex(" + connection.escape(hexkey) + "))";
      } else if (user_type === 2) {
        var sql = "SELECT id, email_id, password " +
          "        FROM artist " +
          "        WHERE email_id = aes_encrypt(" + connection.escape(email_id) + ",unhex(" + connection.escape(hexkey) + "))";
      } else {
        var err = new Error("사용자가 존재하지 않습니다...");
        err.statusCode = -104;
        callback(err);
      }

      connection.query(sql, function (err, results) {
        connection.release();
        if (err) {
          callback(err);
        } else {
          if (results.length === 0) {
            var err = new Error('사용자가 존재하지 않습니다...');
            err.statusCode = -104;
            callback(err); // callback(null, false)로 해도 됨
          } else {
            var user = {
              "id": results[0].id,
              "user_type" : user_type,
              "hashPassword": results[0].password
            };
            callback(null, user);
          }
        }
      });
    }

    function compareUserInput(user, callback) {
      bcrypt.compare(password, user.hashPassword, function (err, result) { // 해시 전 패스워드 다음에 해시 후 패스워드가 와야 한다. 순서 중요
        if (err) {
          callback(err);
        } else {
          if (result) { //true
            callback(null, user);
          } else { //false
            callback(null, false); //비밀번호가 틀렸을 때
          }
        }
      });
    }

    // task 수행 간 결과를 입력으로 전달하는 구조를 지원
    async.waterfall([getConnection, selectUser, compareUserInput], function (err, user) {
      if (err) {
        done(err);
      } else {
        //user 객체에서 password와 hash를 빼서 보내줘야 한다. 보안상 문제가 되기 때문에
        delete user.hashPassword;
        done(null, user);
      }
    });
  }));
};
