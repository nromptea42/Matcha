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

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('inscription');
});

router.post('/insert', function(req, res, next) {
    var item = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age,
        email: req.body.email,
        mdp: "",
        salt: ""
    };
    var msg = [];
    var mdp = req.body.mdp;
    var mdp2 = req.body.mdp2;

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
                                console.log('Item inserted');
                                db.close();
                            });
                        });
                        msg.push("Inscription validée");
                    }
                    else
                        msg.push("Le mot de passe doit faire au moins 6 caractères et contenir un chiffre");
                }
                else
                    msg.push("Les mots de passe doivent etre identiques");
            }
            else
                msg.push("Vous devez etre majeur pour vous inscrire.");
        }
        else
            msg.push("Votre age doit etre un nombre");
    }
    else
        msg.push("Tous les champs doivent etre remplis");
    res.render('inscription', {message: msg});
});

module.exports = router;
