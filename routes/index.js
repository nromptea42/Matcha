var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();

router.use(function (req, res, next) {
    if (req.session && req.session.user) {
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: req.session.user.email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    req.session.user = cursor;
                    // console.log(req.session.user);
                }
                next();
                });
            });
        } else {
        next();
    }
});

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.render('login');
    } else {
        next();
    }
};

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

function sendMail (mail, str, salt) {
    console.log(mail);
    console.log(str);
    var item = {
        mdp: sha256(str + salt)
    };

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').updateOne({email: mail}, {$set: item}, function (err, result) {
            assert.equal(null, err);
            console.log('Item updated');
            db.close();
        });
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"Oui.oui" <' + mail + '>', // sender address
        to: mail, // list of receivers
        subject: 'Réinitialisation de mot de passe', // Subject line
        text: 'Vous avez demandé une réinitialisation de mot de passe, voici le nouveau : ' + str // plaintext body
    };

// send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent');
    });
}

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    var resultArray = [];

    // console.log(req.session.user);
    if (req.session.user.sexe) {
        if (req.session.user.need != 'Les deux') {
            var need = req.session.user.need;
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                var range_min = req.session.user.age - 6;
                // console.log(range_min);
                var range_max = Number(req.session.user.age) + 6;
                // console.log(range_max);
                var cursor = db.collection('user-data').find({sexe: need,
                    "age" : { "$gt": String(range_min), "$lt": String(range_max) } }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    res.render('index', {items: resultArray});
                });
            });
        }
        else {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                var cursor = db.collection('user-data').find({need: "Les deux"}).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id)) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    res.render('index', {items: resultArray});
                });
            });
        }
    }
    else
        res.render('index', {msg: "Veuillez remplir votre profil pour naviguer sur le site."});
});

router.post('/login', function(req, res, next) {
    var email = req.body.email;
    var mdp = req.body.mdp;

    if (email && mdp) {
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    if (cursor.mdp === sha256(mdp + cursor.salt)) {
                        req.session.user = cursor;
                        res.redirect('/');
                    } else {
                        res.redirect('/');
                        res.status(404).end();
                    }
                }
                else {
                    res.redirect('/');
                    res.status(404).end();
                }
            });
            assert.equal(null, err);
        });
    } else {
        res.status(400).end();
        res.redirect('/');
    }
});

router.get('/forgot', function(req, res, next) {
    res.render('forgot')
});

router.post('/email', function(req, res, next) {
   if (req.body.email)
   {
       mongo.connect(url, function (err, db) {
           db.collection('user-data').findOne({email: req.body.email}).then(function (cursor) {
               db.close();
               if (cursor) {
                   sendMail(req.body.email, generateRandomString(6), cursor.salt);
               }
            });
       });
   }
   res.render('forgot');
});

module.exports = router;