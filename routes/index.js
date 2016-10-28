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
    res.render('index');
});

router.post('/login', function(req, res, next) {
    var email = req.body.email;
    var mdp = req.body.mdp;
    var my_cursor;

    if (email && mdp) {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            db.collection('user-data').findOne({email: email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    if(cursor.mdp === sha256(mdp + cursor.salt)) {
                        req.session.user = cursor;
                        res.redirect('liste/profil/' + cursor._id);
                    }
                    else
                        res.render('index');
                }
            });
        });
    }
});

module.exports = router;
