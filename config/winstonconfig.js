var winston = require('winston');
var DailyRoateFile = require('winston-daily-rotate-file');

var config = {
  transports: [
    new winston.transports.Console({
      level: 'error',  //콘솔에서는 에러만
      json:false //json 형태가 불편하다면...
    }),
    //에러만 들어간다
    new DailyRoateFile({
      name : 'warnLoger',
      level: 'warn',
      dirname : './log/',
      filename: 'warn-',
      datePattern: 'yyyy-MM-dd_HH.log', //시간당 로그를 찍는다
      json:false
    }),
    new DailyRoateFile({
      name : 'debugLoger',
      level: 'debug',
      dirname : './log/',
      filename: 'debug-',
      datePattern: 'yyyy-MM-dd_HH.log', //시간당 로그를 찍는다
      json:false
    })
  ]
};

module.exports = config;
