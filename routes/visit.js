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
            res.render('visit', {items: cursor});
        });
    });
});

module.exports = router;