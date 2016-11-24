var express = require('express');
var FB = require('fb');
var router = express.Router();

const token = ''

/* GET users listing. */
router.get('/', function(req, res, next) {
  
});

/* GET users listing. */
router.get('/profile', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
