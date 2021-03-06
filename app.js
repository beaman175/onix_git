var favicon = require('serve-favicon');
var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var path = require('path');
var passport = require('passport'); //passport 설치
var moment = require('moment-timezone');
var nodeschedule = require('node-schedule');
global.pool = require('./config/dbpool');
require('./config/passportconfig')(passport);
var async = require('async');
var flag = 0;

var winston = require('winston');
var winstonconfig = require('./config/winstonconfig');
var logging = new winston.Logger(winstonconfig);


// loading router-level-middleware modules
var artists = require('./routes/artists');
var customers = require('./routes/customers');
var boards = require('./routes/boards');
var jjims = require('./routes/jjims');
var salepushes = require('./routes/salepushes');
var shops = require('./routes/shops');
var auth = require('./routes/auth');


var app = express();

app.set('env', 'production');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
  "secret": process.env.FMS_SERVER_KEY,// 원래는 이렇게 잡아야한다....
  "cookie": {"maxAge": 31536000000}, //유지기간 60*60*24*365*1000  = 1년
  "resave": true,
  "saveUninitialized": true //초기화 되지 않은상태여도 저장
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


//0시마다 스케줄링
app.use(function (req, res, next) {
  if (flag === 0) {
    var cronstyle = '0 0 15 * * * *';
    var job = nodeschedule.scheduleJob(cronstyle, function () {
      function getConnection(callback) {
        pool.getConnection(function (err, connection) {
          if (err) {
            callback(err);
          } else {
            callback(null, connection);
          }
        });
      }
      function initalSaleMsg(connection, callback) {
        connection.beginTransaction(function (err) {
          if (err) {
            connection.release();
            callback(err);
          }
          else {
            function deleteMsg(cb) {
              var deleteSalemsgSql = "delete FROM salepushmsg";
              connection.query(deleteSalemsgSql, function (err) {
                if (err) {
                  connection.rollback();
                  connection.release();
                  logging.log('error', '스케줄링 세일 푸시 메시지 삭제 에러');
                  cb(err);
                } else {
                  cb(null);
                }
              });
            }

            function updateDiscount(cb) {
              var updateDiscountSql = "update artist set discount = 0 ";
              connection.query(updateDiscountSql, function (err) {
                if (err) {
                  connection.rollback();
                  connection.release();
                  logging.log('error', '스케줄링 discount 업데이트 에러');
                  cb(err);
                } else {
                  connection.commit();
                  connection.release();
                  cb(null);
                }
              });
            }

            async.series([deleteMsg, updateDiscount], function (err) {
              if (err) {
                callback(err);
              } else {
                callback(null);
              }
            });
          }
        });
      }
      async.waterfall([getConnection, initalSaleMsg], function (err) {
        if (err) {
          next(err);
        } else {
          logging.log('info', moment().tz('Asia/Seoul').format("YYYY-MM-DD HH:mm:ss"));
          logging.log('info', '스케줄링 완료!!');
        }
      });
    });
    flag = 1;
    next();
  }
  else {
    next();
  }
});

//mapping mount points with router-level middleware modules
app.use('/shops', shops);
app.use('/artists', artists);
app.use('/customers', customers);
app.use('/boards', boards);
app.use('/auth', auth);
app.use('/jjims', jjims);
app.use('/salepushes', salepushes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.statusCode || 500);
  logging.log('error', err.message);
  res.json('error', {
    "failResult": {
      err_code: err.statusCode,
      message: err.message
    }
  });
});


module.exports = app;
