var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');

/* GET home page. */
router.get('/', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        var d = new Date();
        db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)},
            {$set: {connected: false, last_date: d.toUTCString()}}, function (err, result) {
            req.session.reset();
            res.redirect('/');
        });
    });
});

module.exports = router;