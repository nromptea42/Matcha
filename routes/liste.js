var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log(req.session.user_id);
    var resultArray = [];
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        var cursor = db.collection('user-data').find().sort({_id : -1});
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            resultArray.push(doc);
        }, function () {
            db.close();
            res.render('liste', {items: resultArray});
        });
    });
});

router.post('/delete', function(req, res, next) {
    var id = req.body.id;

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').deleteOne({"_id": objectId(id)}, function (err, result) {
            assert.equal(null, err);
            console.log('Item deleted');
            db.close();
            res.redirect('/liste');
        });
    });
});

router.get('/profil/:id', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            res.render('profil', {items: cursor, check: true});
        });
    });
});

router.get('/profil/:id/update', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            res.render('profil', {items: cursor, check: false});
        });
    });
});

router.post('/profil', function(req, res, next) {
    if (req.body.update)
        var id = req.body.id + "/update";
    else
        var id = req.body.id;

    res.redirect('/liste/profil/' + id);
});


router.post('/profil/update', function(req, res, next) {
    var item = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age,
        email: req.body.email
    };
    var id = req.body.id;
    if (!isNaN(item.age)) {
        if (Number(item.age) >= 18) {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                db.collection('user-data').updateOne({"_id": objectId(id)}, {$set: item}, function (err, result) {
                    assert.equal(null, err);
                    console.log('Item updated');
                    db.close();
                });
            });
        }
    }
    res.redirect('/liste/profil/' + id);
});

module.exports = router;
