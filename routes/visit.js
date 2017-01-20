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
    // console.log(req.query.id);
    if (req.query.id)
        res.redirect('/visit/' + req.query.id);
    else
        res.redirect('/');
});

router.get('/:id', requireLogin, function(req, res, next) {
    if (req.session.user.ban.indexOf(req.params.id) == -1 && req.session.user._id != req.params.id) {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
                db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
                    db.close();
                    if (cursor) {
                        var str = "CE PROFIL NE TE LIKE PAS";
                        if (cursor.liked.indexOf(String(req.session.user._id)) != -1)
                            str = "CE PROFIL TE LIKE YOUHOU";
                        if (req.session.user.src_img[0] != "https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png") {
                            if (req.session.user.liked.indexOf(String(cursor._id)) != -1) {
                                res.render('visit', {
                                    items: cursor,
                                    me: req.session.user,
                                    nop: "Vous likez deja cette personne !",
                                    liked: true,
                                    m: str
                                });
                            }
                            else
                                res.render('visit', {items: cursor, me: req.session.user, m: str});
                        }
                        else
                            res.render('visit', {
                                items: cursor,
                                me: req.session.user,
                                nop: "Ajoutez une image pour pouvoir like",
                                m: str
                            });
                    }
                    else
                        res.redirect('/');
                });
            }
            else
                res.redirect('/');
        });
    }
    else
        res.redirect('/');
});

router.post('/like', requireLogin, function(req, res, next) {
    // console.log(req.body.id);
    if (req.session.user.src_img[0] != "https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png") {
        var i = 0;
        var item = {
            liked: req.session.user.liked
        };
        var check = true;

        // if (item.liked.indexOf(req.body.id != -1)) {
        //     check = false;
        // }

        mongo.connect(url, function (err, db) {
            db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: item}, function (err, result) {
                assert.equal(null, err);
            });
            db.close();
        });

        while (item.liked[i]) {
            if (item.liked[i] == req.body.id)
                check = false;
            i++;
        }
        // console.log(item.liked);
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

router.post('/unlike', requireLogin, function(req, res, next) {
    if (req.session.user.src_img[0] != "https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png") {
        var item = {
          liked: req.session.user.liked
        };

        var index = item.liked.indexOf(String(req.body.id));
        if (index > -1)
            item.liked.splice(index, 1);
        console.log(item.liked);

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
});

router.post('/ban', requireLogin, function(req, res, next) {
    var item = {
        liked: req.session.user.liked,
        ban: req.session.user.ban
    };

    if (item.ban.indexOf(String(req.body.id)) == -1) {
        var index = item.liked.indexOf(String(req.body.id));
        if (index > -1)
            item.liked.splice(index, 1);
        item.ban.push(req.body.id);
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: item}, function (err, result) {
                assert.equal(null, err);
                db.collection('user-data').updateOne({"_id": objectId(req.body.id)}, {$push: {ban: String(req.session.user._id)}}, function (err, result) {
                    assert.equal(null, err);
                    db.close();
                    res.redirect('/');
                });
            });
        });
    }
    else
        res.redirect('/');
});

module.exports = router;