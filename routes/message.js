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
}

function isInTab (data, tab) {
    var i = 0;
    while (tab[i]) {
        if (tab[i] == data)
            return true;
        i++;
    }
    return false;
}

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
                if (isInTab(String(doc._id), req.session.user.liked)) {
                    if (isInTab(String(req.session.user._id), doc.liked)) {
                        console.log("MATCH");
                        match.push(doc);
                    }
                }
        }, function () {
            db.close();
            // console.log(match);
            res.render('matched', {match: match});
        });
    });
});

router.get('/go', requireLogin, function(req, res, next) {
    console.log(req.query.id);
    if (req.query.id)
        res.redirect('/message/' + req.query.id);
    else
        res.redirect('/');
});

router.get('/:id', requireLogin, function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            var datas = db.collection('messages').find({
                "expe": {$in: [String(req.session.user._id), String(cursor._id)]},
                "desti": {$in: [String(req.session.user._id), String(cursor._id)]}
            });
            var tab_msg = [];
            datas.forEach(function (doc, err) {
                tab_msg.push({m: doc.message, n: doc.name});
            }, function () {
                db.close();
                res.render('message', {exp: req.session.user._id, dest: cursor._id, message: tab_msg, name: req.session.user.prenom, name_dest: cursor.prenom});
            });
        });
    });
});

module.exports = router;