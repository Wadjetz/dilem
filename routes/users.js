var express = require('express');
var router = express.Router();

var fb = require('fb');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET users listing. */
router.get('/profile', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
