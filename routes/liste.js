var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

/* GET home page. */
router.get('/', function(req, res, next) {
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
            console.log(cursor);
            res.render('profil', {items: cursor});
        });
    });
});

router.post('/profil', function(req, res, next) {
    var id = req.body.id;

    res.redirect('/liste/profil/' + id);
});

module.exports = router;
