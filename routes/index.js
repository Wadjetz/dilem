"use strict";
const UserModel = require('../models/user')
const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const uuid = require('uuid');
const fb = require('fb');
const request = require('request');

const token = "<insert fb token>";

// Download helper
var download = function(uri, filename, callback){
    request.get(uri).on('end', callback).pipe(fs.createWriteStream(filename));
};

// Middleware to pixelise the requested image
var pixeliser = function (dir) {
    return (req, res, next) => {
        let blurLevel = parseInt(req.params.blurLevel) || 20;

        let transformerDown = sharp().resize(blurLevel);
        let transformerUp = sharp().resize(800, undefined, { interpolator : 'nearest' });

        req.outputFile = fs.createReadStream(path.join(dir, req.params.fileName))
            .pipe(transformerDown)
            .pipe(transformerUp);

        next();
    }
};

// temp : download the profile image
router.get('/download_image', function(req, res, next) {
    fb.api('me', { fields: ['id', 'name', 'picture.height(300)', 'birthday', 'gender', 'hometown', 'meeting_for', 'age_range'], width: 100, access_token: token }, function (data) {
        UserModel.findOne({ id: data.id }).then(u => {
            console.log('find ', u, data.id)
            if (!u) {
                let user = new UserModel(data);
                user.picture = data.id + '.jpg'
                user.save(result => {
                    console.log(data, result);
                    // Download the facebook profile picture
                    download(data.picture.data.url, path.join(__dirname, "..", data.id + ".jpg"), () => {
                        // Return the URL
                        user.picture = req.protocol + '://' + req.get('host') + "/30/" +  user.id + ".jpg"
                        res.json(user);
                    })
                })
            } else {
                u.picture = req.protocol + '://' + req.get('host') + "/30/" +  u.id + ".jpg"
                res.json(u);
            }
        })
    });
});

// Give a blured image
router.get('/:blurLevel/:fileName', pixeliser(__dirname + "/../"), function(req, res, next) {
    console.log("blurLevel: " + req.params.blurLevel);
    console.log("fileName: " + req.params.fileName);
    req.outputFile.pipe(res);
});

module.exports = router;
