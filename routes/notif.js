var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";
var http = require('http');
var S = require('string');

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
}

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        var notif_tab = [];
        var cursor = db.collection('notifs').find().sort({_id: -1});
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            if (doc.desti == req.session.user._id)
                notif_tab.push(doc);
        }, function () {
            db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: {nb_notif: 0}}, function (err, result) {
                // console.log("oui");
            });
            db.close();
            // console.log(notif_tab);
            res.render('notif', {notifs: notif_tab});
        });
    });
});

module.exports = router;