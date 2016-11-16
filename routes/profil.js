var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
};


/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    id = req.session.user._id;
    res.redirect('/profil/' + id);
});

router.post('/oui', function(req, res, next) {
    if (req.body.update && (req.session.user._id == req.body.id))
        var id = req.session.user._id + "/update";
    else
        var id = req.body.id;

    res.redirect('/profil/' + id);
});

router.get('/:id', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            /* Check pour data en dur + bouton vers route 'oui' */
            res.render('profil', {items: cursor, check: true});
        });
    });
});

router.get('/:id/update', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            /* Check pour data en formulaire + bouton vers route 'update' */
            res.render('profil', {items: cursor, check: false});
        });
    });
});

router.post('/update', function(req, res, next) {
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
    res.redirect('/profil/' + id);
});

module.exports = router;