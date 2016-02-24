var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.secure){
    var err = new Error('Test 123....');
    err.status = -110;
    next(err);
  }else{
    res.render('index', { title: 'Express' });
  }
});

module.exports = router;
