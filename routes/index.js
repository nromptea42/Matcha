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
var http = require('http');

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

function generateRandomString(length) {
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
    mongo.connect(url, function (err, db) {
        db.collection('user-data').updateOne({"_id": req.session.user._id}, {$set: {connected: true}}, function (err, result) {
            // console.log("done");
        });
    });
    var resultArray = [];
    // console.log(req.session.user);
    if (req.session.user.sexe) {
        var need = req.session.user.need;
        if (req.session.user.need != 'Les deux') {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                var cursor = db.collection('user-data').find({
                    "sexe" : need,
                    "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                        },
                        $maxDistance:30000}}
                }).sort({popu: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    if (!resultArray[0])
                        res.render('index', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                    else
                        res.render('index', {items: resultArray, which: "index"});
                });
            });
        }
        else {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                var cursor = db.collection('user-data').find({
                    "need" : {$in: ["Les deux", req.session.user.sexe]},
                    "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                        },
                        $maxDistance:30000}}
                }).sort({popu: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    if (!resultArray[0])
                        res.render('index', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                    else
                        res.render('index', {items: resultArray, which: "index"});
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
    var item = {
        location: { type: "Point", coordinates: [] },
        ville: "",
        connected: true
    };

    if (email && mdp) {
        if (req.body.long != "none" && req.body.lat != "none")
            item.location.coordinates = [Number(req.body.long), Number(req.body.lat)];
        mongo.connect(url, function (err, db) {
            db.collection('user-data').findOne({email: email}).then(function (cursor) {
                db.close();
                if (cursor) {
                    if (cursor.mdp === sha256(mdp + cursor.salt)) {
                        req.session.user = cursor;
                        if (!cursor.ville) {
                            http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function (resp) {
                                resp.on('data', function (ip) {
                                    // console.log("My public IP address is: " + ip);
                                    http.get({
                                        'host': 'freegeoip.net',
                                        'port': 80,
                                        'path': '/json/' + ip
                                    }, function (resp) {
                                        resp.on('data', function (infos) {
                                            var x = JSON.parse(infos);
                                            // console.log(x);
                                            if (req.body.long != "none" && req.body.lat != "none")
                                                item.location.coordinates = [Number(req.body.long), Number(req.body.lat)];
                                            else
                                                item.location.coordinates = [Number(x.longitude), Number(x.latitude)];
                                            mongo.connect(url, function (err, db) {
                                                assert.equal(null, err);
                                                db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: item}, function (err, result) {
                                                    assert.equal(null, err);
                                                    console.log('Item updated');
                                                    db.close();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        }
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

// ATTENTION: ATTENTION ICI AU REQUIRE LOGIN

router.get('/getId', function(req, res, next) {
    if (req.session.user)
        res.send(req.session.user);
});

module.exports = router;