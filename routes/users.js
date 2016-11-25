"use strict";

const UserModel = require('../models/user');
const MessageModel = require('../models/message');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const uuid = require('uuid');
const fb = require('fb');
const request = require('request');

const token = 'EAACEdEose0cBAIr320YcIPM3qjisSXoGNixI5BO1r9z9U5oGvr6oLeiyAxSVDJRCLiNgHSgviJiMZABByr3WwDHW5J18HXeO2DzpsPU7ZAugXacW7ll2xFxsOoCfujc5ddFLQUPJtmRLrs1MXrZB8EugynZBYzUo4Q2mWyJ5hQZDZD';
const secret = 'lolsdnqndqndqsndqsndqsnd';

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

// JWT token middleware
var withAuth = function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        jwt.verify(token, secret, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                req.session = decoded;
                next();
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
};

// Get all the message exchanged with someone
router.get('/messages/with/:other', withAuth, (req, res, next) => {
   let request = {
       "$or" : [
           { from : req.params.other, to : req.session.id },
           { from : req.session.id, to : req.params.other }
       ]
   };

    MessageModel.find(request).select('-__v -_id').sort({ date: -1 }).then(messages => {
        res.json(messages);
    });

});

// Post a message to someone
router.post('/messages/to/:to', withAuth, (req, res, next) => {

    let message = new MessageModel({
        from : req.session.id,
        to : req.params.to,
        date : new Date(),
        message : req.body.message
    });

    message.save(result => {
        res.json({
            status: "OK"
        });
    });
});

// Signup & download
router.post('/signup', (req, res, next) => {
    fb.api('me', { fields: ['id', 'name', 'picture.height(300)', 'birthday', 'gender', 'hometown', 'meeting_for', 'age_range'], width: 100, access_token: token }, function (data) {
        UserModel.findOne({ id: data.id }).then(u => {
            const token = jwt.sign({ id: data.id }, secret);
            console.log('find ', u, data.id);
            if (!u) {
                let user = new UserModel(data);
                user.picture = data.id + '.jpg';
                user.birthday = moment.utc(data.birthday, 'MM/DD/YYYY').toDate();
                user.save(result => {
                    console.log(data, result);
                    // Download the facebook profile picture
                    download(data.picture.data.url, path.join(__dirname, "..", data.id + ".jpg"), () => {
                        // Return the URL
                        user.picture = req.protocol + '://' + req.get('host') + "/30/" +  user.id + ".jpg"
                        res.json({
                          user: user,
                          token: token,
                        });
                    })
                })
            } else {
                u.picture = req.protocol + '://' + req.get('host') + "/30/" +  u.id + ".jpg";
                res.json({
                  user: u,
                  token: token,
                });
            }
        })
    });
});

// Get all the users
router.get('/', withAuth, (req, res, next) => {
    let query = {
        gender: req.query.gender || 'female',
        age_min: req.query.age_min || 18,
        age_max: req.query.age_max || 18 + 5,
    };
    UserModel.find(query).then(users => {
        res.json(users)
    });
});

// Get the current user
router.get('/me', withAuth, (req, res, next) => {
    let query = {
        id: req.session.id,
    };

    UserModel.findOne(query).select('-__v -_id').then(user => {
        res.json(user)
    });
});

// Get someone info
router.get('/:id', withAuth, (req, res, next) => {
    let query = {
        id: req.params.id,
    };

    UserModel.findOne(query).select('-__v -_id').then(user => {
        if(user)
            res.json(user);
        else {
            res.statusCode = 404;
            next();
        }
    });
});

// Give a blured image
router.get('/:blurLevel/:fileName', pixeliser(__dirname + "/../"), function(req, res, next) {
    console.log("blurLevel: " + req.params.blurLevel);
    console.log("fileName: " + req.params.fileName);
    req.outputFile.pipe(res);
});

module.exports = router;
