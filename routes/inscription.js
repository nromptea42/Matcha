var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";
var sha256 = require('js-sha256');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomString(length)
{
    var characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var charactersLength = characters.length;
    var randomString = '';
    for (i = 0; i < length; i++) {
        randomString = randomString + characters[getRandomInt(0, charactersLength - 1)];
    }
    return randomString;
}

function regex(value) {
    var regex1 = /[A-Za-z]/;
    var regex2 = /[0-9]/;
    var match1 = regex1.test(value);
    var match2 = regex2.test(value);
    if (match1 && match2)
        return ("ok");
    else
        return ("ko");
}

function requireNonLogin (req, res, next) {
    if (req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
};

/* GET home page. */
router.get('/', requireNonLogin, function(req, res, next) {
    res.render('inscription');
});

router.post('/insert', function(req, res, next) {
    var item = {
        location: { "type": "Point", "coordinates": [2, 48] },
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age,
        email: req.body.email,
        mdp: "",
        salt: "",
        src_img: ["https://cdn1.iconfinder.com/data/icons/ninja-things-1/1772/ninja-simple-512.png"],
        nb_img: 0,
        sexe: "",
        need: "Les deux",
        bio: "",
        tags_str: "",
        tags: [],
        ville: "",
        liked: []
    };
    var msg = [];
    var mdp = req.body.mdp;
    var mdp2 = req.body.mdp2;

    var i = 0;

    mongo.connect(url, function (err, db) {
        db.collection('user-data').findOne({email: item.email}).then(function (cursor) {
            db.close();
            if (!cursor) {
                if (item.nom && item.prenom && item.age && item.email && mdp && mdp2) {
                    if (!isNaN(item.age)) {
                        if (Number(item.age) >= 18) {
                            if (mdp == mdp2) {
                                if (regex(mdp) == "ok" && mdp.length >= 6) {
                                    item.salt = generateRandomString(20);
                                    var hashed = sha256(mdp + item.salt);
                                    item.mdp = hashed;

                                    mongo.connect(url, function (err, db) {
                                        assert.equal(null, err);
                                        db.collection('user-data').insertOne(item, function (err, result) {
                                            assert.equal(null, err);
                                            i = 1;
                                            console.log('Item inserted');
                                            db.close();
                                        });
                                    });
                                    res.render('inscription', {message : "Inscription validée"});
                                }
                                else
                                    res.render('inscription', {message : "Le mot de passe doit faire au moins 6 caractères et contenir un chiffre"});
                            }
                            else
                                res.render('inscription', {message : "Les mots de passe doivent etre identiques"});
                        }
                        else
                            res.render('inscription', {message : "Vous devez etre majeur pour vous inscrire."});
                    }
                    else
                        res.render('inscription', {message : "Votre age doit etre un nombre"});
                }
                else
                    res.render('inscription', {message : "Tous les champs doivent etre remplis"});
            }
            else
                res.render('inscription', {message: "Email deja utilise"});
        });
    });
});

module.exports = router;