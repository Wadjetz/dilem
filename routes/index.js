"use strict";

const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const uuid = require('uuid');

var pixeliser = function (dir) {
    return (req, res, next) => {
        let blurLevel = parseInt(req.params.blurLevel);

        let transformerDown = sharp().resize(blurLevel);
        let transformerUp = sharp().resize(800, undefined, { interpolator : 'nearest' });

        req.outputFile = fs.createReadStream(path.join(dir, req.params.fileName))
            .pipe(transformerDown)
            .pipe(transformerUp);

        next();
    }
};

/* GET home page. */
router.get('/:blurLevel/:fileName', pixeliser(__dirname + "/../"), function(req, res, next) {
    console.log("blurLevel: " + req.params.blurLevel);
    console.log("fileName: " + req.params.fileName);
    req.outputFile.pipe(res);
});

module.exports = router;
