var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');

router.use(function (req, res, next) {
    if (req.session && req.session.user) {
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: req.session.user.email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    req.session.user = cursor;
                    console.log(req.session.user);
                }
                next();
                });
            });
        } else {
        next();
    }
});

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.render('login');
    } else {
        next();
    }
};

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
        res.render('index');
});

router.post('/login', function(req, res, next) {
    var email = req.body.email;
    var mdp = req.body.mdp;

    if (email && mdp) {
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    if (cursor.mdp === sha256(mdp + cursor.salt)) {
                        req.session.user = cursor;
                        res.redirect('/');
                    } else {
                        res.redirect('/');
                        res.status(404).end();
                    }
                }
                else {
                    res.redirect('/');
                    res.status(404).end();
                }
            });
            assert.equal(null, err);
        });
    } else {
        res.status(400).end();
        res.redirect('/');
    }
});

module.exports = router;