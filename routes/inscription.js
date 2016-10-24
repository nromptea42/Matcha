var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('inscription');
});

router.post('/insert', function(req, res, next) {
    var item = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age
    };
    var msg = "";

    if (item.nom && item.prenom && item.age) {
        if (!isNaN(item.age)) {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                db.collection('user-data').insertOne(item, function (err, result) {
                    assert.equal(null, err);
                    console.log('Item inserted');
                    db.close();
                });
            });
            msg = "Inscription validée";
        }
    }
    res.render('inscription', {message: msg});
});

router.post('/update', function(req, res, next) {
    var item = {
        title: req.body.title,
        content: req.body.content,
        author: req.body.author
    };
    var id = req.body.id;

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').updateOne({"_id": objectId(id)}, {$set: item}, function (err, result) {
            assert.equal(null, err);
            console.log('Item updated');
            db.close();
        });
    });
});

module.exports = router;
