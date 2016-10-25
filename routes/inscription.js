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
    var msg = "Erreur lors de l'inscription";

    if (item.nom && item.prenom && item.age) {
        if (!isNaN(item.age)) {
            if (Number(item.age) >= 18 && Number(item.age) <= 100) {
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
    }
    res.render('inscription', {message: msg});
});

module.exports = router;
