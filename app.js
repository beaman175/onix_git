var favicon = require('serve-favicon');
var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var path = require('path');
// loading router-level-middleware modules

var index = require('./routes/index');
var artists = require('./routes/artists');
var customers = require('./routes/customers');
var boards = require('./routes/boards');
var jjims = require('./routes/jjims');
var salepushes = require('./routes/salepushes');
var shops = require('./routes/shops');
var login = require('./routes/login');

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
    //"sevret": process.env.SERVER_KEY,// 원래는 이렇게 잡아야한다....
    "secret": "GCDjbIY9JsF4XSI/005Qa+SsHZQS6zxPeUmSHOHKoOA=", // 서버만 가지고 있는 정보 (openssl)
    "cookie": {"maxAge": 86400000}, //유지기간 60*60*24*365*1000  = 1년
    "resave": true,
    "saveUnitalized": true
}));

app.use(express.static(path.join(__dirname, 'public')));

//mapping mount points with router-level middleware modules
app.use('/',index);

app.use('/shops',shops);
app.use('/artists',artists);
app.use('/customers',customers);
app.use('/boards',boards);
app.use('/login',login);
app.use('/jjims',jjims);
app.use('/salepushes',salepushes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        //res.render('error', {
        //에러가 발생하면 json으로 출력
        res.json('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    //res.render('error', {
    //에러가 발생하면 json으로 출력
    res.json('error', {
        message: err.message,
        error: err
    });
});


module.exports = app;
