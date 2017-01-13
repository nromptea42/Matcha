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
    console.log(req.query.id);
    if (req.query.id)
        res.redirect('/visit/' + req.query.id);
    else
        res.redirect('/');
});

router.get('/:id', requireLogin, function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            if (req.session.user.src_img[0] != "https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png")
                res.render('visit', {items: cursor, me: req.session.user._id});
            else
                res.render('visit', {items: cursor, me: req.session._id, nop: "Ajoutez une image pour pouvoir like"});
        });
    });
});

router.post('/like', requireLogin, function(req, res, next) {
    // console.log(req.body.id);
    if (req.session.user.src_img[0] != "https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png") {
        var i = 0;
        var item = {
            liked: req.session.user.liked
        };
        var check = true;

        while (item.liked[i]) {
            if (item.liked[i] == req.body.id)
                check = false;
            i++;
        }
        console.log(item.liked);
        if (check) {
            item.liked.push(req.body.id);
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: item}, function (err, result) {
                    assert.equal(null, err);
                    console.log('Item updated');
                    db.close();
                    res.redirect('/visit/' + req.body.id);
                });
            });
        }
        else
            res.redirect('/visit/' + req.body.id);
    }
    else
        res.redirect('/visit/' + req.body.id);
});
module.exports = router;