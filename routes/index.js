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
    if (!req.session.user)
        res.render('index');
    else
        res.render('member');

});

router.post('/login', function(req, res, next) {
    var email = req.body.email;
    var mdp = req.body.mdp;
    var my_cursor;

    if (email && mdp) {
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    if (cursor.mdp === sha256(mdp + cursor.salt)) {
                        req.session.user_id = cursor._id;
                        res.set('user_id', req.session.user_id);
                        res.json();
                    } else {
                        res.status(404).end();
                    }
                }
            });
            assert.equal(null, err);
        });
    } else {
        res.status(400).end();
    }
});

module.exports = router;