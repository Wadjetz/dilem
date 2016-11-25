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

const secret = 'lolsdnqndqndqsndqsndqsnd';
const photoFolder = __dirname + "/../";

// Download helper
var download = function(uri, filename, callback){
    request.get(uri).on('end', callback).pipe(fs.createWriteStream(filename));
};

// Image modification helper
var pixelizer = function(path, blurLevel, callback) {
    let transformerScale = sharp().resize(800);
    let transformerDown = sharp().resize(800 * blurLevel/100);
    let transformerUp = sharp().resize(800, undefined, { interpolator : 'nearest' });

    callback(fs.createReadStream(path)
        .pipe(transformerScale)
        .pipe(transformerDown)
        .pipe(transformerUp));
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
    let facebook_token = req.body.facebook_token;

    if(!facebook_token) {
        res.statusCode = 403;
        res.json({
            success: false,
            message: 'No facebook auth token provided.'
        });
        return;
    }

    fb.api('me', { fields: ['id', 'name', 'picture.height(300)', 'birthday', 'gender', 'hometown', 'meeting_for', 'age_range'], width: 100, access_token: facebook_token }, function (data) {
        UserModel.findOne({ id: data.id }).then(u => {
            const token = jwt.sign({ id: data.id }, secret);
            console.log('find ', u, data.id);
            if (!u) {
                let user = new UserModel(data);
                user.picture = req.protocol + '://' + req.get('host') + '/users/' + data.id + '/photo.jpg';
                user.birthday = moment.utc(data.birthday, 'MM/DD/YYYY').toDate();
                user.save(result => {
                    console.log(data, result);
                    // Download the facebook profile picture
                    download(data.picture.data.url, path.join(__dirname, "..", data.id + ".jpg"), () => {
                        // Return the user
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
    UserModel.find(query).select('-__v -_id').then(users => {
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

const photoLevels = [
    { exchanges : 0, blurLevel : 2 },
    { exchanges : 3, blurLevel : 3 },
    { exchanges : 6, blurLevel : 4 },
    { exchanges : 10, blurLevel : 5 },
    { exchanges : 15, blurLevel : 10 },
    { exchanges : 20, blurLevel : 100 },
];

router.get('/:id/photo.jpg', withAuth, function(req, res, next) {
    let request = {
        "$or" : [
            { from : req.params.id, to : req.session.id },
            { from : req.session.id, to : req.params.id }
        ]
    };

    MessageModel.find(request).select('-__v -_id').sort({ date: -1 }).then(messages => {
        // Get the total number of exchanges
        let exchanges = messages.reduce((message, acc) => {
            if(message.from != acc.last)
                return { counter : acc.counter + 1, last : acc.last };
            else
                return { counter : acc.counter, last : acc.last }
        }, { counter : 0, last : req.session.id });

        // Find the photo level corresponding to the number of exchanges
        let photoLevel = photoLevels.find(level => level.exchanges >= exchanges.counter);

        // Return the blurred picture
        pixelizer(path.join(photoFolder, req.params.id + '.jpg'), photoLevel.blurLevel, outputFile => {
            res.writeHead(200, {'Content-Type': 'image/jpg' });
            outputFile.pipe(res)
        });
    });

});

// Give a blured image
router.get('/:blurLevel/:fileName', function(req, res, next) {
    pixelizer(path.join(photoFolder, req.params.fileName), parseInt(req.params.blurLevel), outputFile => {
        res.writeHead(200, {'Content-Type': 'image/jpg' });
        outputFile.pipe(res)
    });
});

module.exports = router;
