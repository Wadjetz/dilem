"use strict";

var express = require('express');
var sharp = require('sharp');
var fs = require('fs');
var path = require('path');
var router = express.Router();



/* GET home page. */
router.get('/', function(req, res, next) {
    let transformerDown = sharp().resize(20, 20);
    let transformerUp = sharp().resize(600, 600, { interpolator : 'nearest' });

    fs.createReadStream('trump.jpg')
        .pipe(transformerDown)
        .pipe(transformerUp)
        .pipe(res);
});

module.exports = router;
