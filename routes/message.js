var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";
var http = require('http');

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.render('login');
    } else {
        next();
    }
};

router.get('/', requireLogin, function(req, res, next) {
    // console.log(req.session.user.liked);
    var match = [];
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        var i = 0;
        var cursor = db.collection('user-data').find();
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            // console.log(doc);
                if (req.session.user.liked[i] == String(doc._id)) {
                        var j = 0;
                        while (doc.liked[j]) {
                            if (doc.liked[j] == req.session.user._id) {
                                console.log("i'm here");
                                match.push(doc._id);
                            }
                            j++;
                        }
                        i++;
                }
        }, function () {
            // db.close();
            console.log(match);
            res.render('message', {exp: req.session.user._id});
        });
    });
});

module.exports = router;