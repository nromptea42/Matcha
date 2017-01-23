var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var http = require('http');
var S = require('string');

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

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    res.render('filtre');
});

router.post('/age', requireLogin, function(req, res, next) {
    console.log(req.body.age_min);
    console.log(req.body.age_max);

    var resultArray = [];

    if (req.body.age_min <= req.body.age_max) {
        if (req.session.user.need != "Les deux") {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)},
                    "location": { $near: { $geometry:
                    {
                        type:"Point",
                        coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                    },
                        $maxDistance:30000}}
                }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id)
                        && req.session.user.ban.indexOf(String(doc._id)) == -1
                        && [req.session.user.sexe, "Les deux"].indexOf(doc.need) != -1 ) {
                        resultArray.push(doc);
                    }
                }, function () {
                        db.close();
                        if (!resultArray[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {
                                items: resultArray,
                                which: "age " + req.body.age_min + " " + req.body.age_max
                            });
                    });
                });
        }
        else {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    "need" : {$in: ["Les deux", req.session.user.sexe]},
                    "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)},
                    "location": { $near: { $geometry:
                    {
                        type:"Point",
                        coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                    },
                        $maxDistance:30000}}
                }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                        resultArray.push(doc);
                    }
                }, function () {
                        db.close();
                        if (!resultArray[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {items: resultArray, which: "age " + req.body.age_min + " " + req.body.age_max });
                    });
                });
        }

    }
    else
        res.render('filtre');
});

router.post('/region', requireLogin, function(req, res, next) {
    console.log(req.body.zip);
    var resultArray = [];

    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            http.get({
                'host': 'maps.googleapis.com',
                'path': '/maps/api/geocode/json?address=' + S(req.body.zip).slugify().s + ",%20France"
            }, function (resp) {
                resp.on('data', function (maps_infos) {
                    var y = JSON.parse(maps_infos);
                    if (y.status == "OK") {
                        console.log(Number(y.results[0].geometry.location.lat));
                        console.log(Number(y.results[0].geometry.location.lng));
                        var cursor = db.collection('user-data').find({
                            sexe: req.session.user.need,
                            "location": {
                                $near: {
                                    $geometry: {
                                        type: "Point",
                                        coordinates: [Number(y.results[0].geometry.location.lng), Number(y.results[0].geometry.location.lat)]
                                    },
                                    $maxDistance: 30000
                                }
                            }
                        }).sort({_id: -1});
                        cursor.forEach(function (doc, err) {
                            assert.equal(null, err);
                            if (String(doc._id) != String(req.session.user._id)
                                && req.session.user.ban.indexOf(String(doc._id)) == -1
                                && [req.session.user.sexe, "Les deux"].indexOf(doc.need) != -1 ) {
                                resultArray.push(doc);
                            }
                        }, function () {
                            db.close();
                            if (!resultArray[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, which: "region " + req.body.zip});
                        });
                    }
                    else
                        res.render('filtre');
                });
            });
        });
    }
    else  {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            http.get({
                'host': 'maps.googleapis.com',
                'path': '/maps/api/geocode/json?address=' + req.body.zip + ",%20France"
            }, function (resp) {
                resp.on('data', function (maps_infos) {
                    var y = JSON.parse(maps_infos);
                    // console.log(y);
                    var cursor = db.collection('user-data').find({
                        "need" : {$in: ["Les deux", req.session.user.sexe]},
                        "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[Number(y.results[0].geometry.location.lng), Number(y.results[0].geometry.location.lat)]
                        },
                            $maxDistance:30000}}
                    }).sort({_id: -1});
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                            resultArray.push(doc);
                        }
                    }, function () {
                            db.close();
                            if (!resultArray[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, which: "region " + req.body.zip});
                        });
                    });
                });
            });
    }
});

router.post('/tags', requireLogin, function(req, res, next) {
    splited = req.body.tags.split(" ");

    var resultArray = [];
    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            var cursor = db.collection('user-data').find({
                sexe: req.session.user.need,
            }).sort({_id: -1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if (String(doc._id) != String(req.session.user._id)
                    && req.session.user.ban.indexOf(String(doc._id)) == -1
                    && [req.session.user.sexe, "Les deux"].indexOf(doc.need) != -1 ) {
                    var i = 0;
                    var nb = 0;
                    var tag_split = doc.tags;
                    // console.log(tag_split);
                    while (splited[i]) {
                        var j = 0;
                        while (tag_split[j]) {
                            // console.log(tag_split[j]);
                            if (splited[i] == tag_split[j])
                                nb++;
                            j++;
                        }
                        i++;
                    }
                    var item = {
                        nb_match: nb,
                        user: doc
                    };
                    resultArray.push(item);
                }
            }, function () {
                db.close();
                len = resultArray.length;
                var tmp;

                while (len - 1 > 0) {
                    var k = 0;
                    while (resultArray[k + 1]) {
                        if (resultArray[k].nb_match < resultArray[k + 1].nb_match) {
                            tmp = resultArray[k];
                            resultArray[k] = resultArray[k + 1];
                            resultArray[k + 1] = tmp;
                        }
                        k++;
                    }
                    len--;
                }

                var i = 0;
                var newTab = [];
                var newTab2 = [];
                while (resultArray[i] && resultArray[i].nb_match > 0) {
                    newTab[i] = resultArray[i].user;
                    i++;
                }
                while (resultArray[i]) {
                    newTab2[i] = resultArray[i].user;
                    i++;
                }
                // console.log(newTab);
                // console.log(newTab2);

                if (!newTab[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, which: "tags " + req.body.tags});
            });
        });
    }
    else {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            var cursor = db.collection('user-data').find({
                "need" : {$in: ["Les deux", req.session.user.sexe]},
            }).sort({_id: -1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                    var i = 0;
                    var nb = 0;
                    var tag_split = doc.tags;
                    // console.log(tag_split);
                    while (splited[i]) {
                        var j = 0;
                        while (tag_split[j]) {
                            // console.log(tag_split[j]);
                            if (splited[i] == tag_split[j])
                                nb++;
                            j++;
                        }
                        i++;
                    }
                    var item = {
                        nb_match: nb,
                        user: doc
                    };
                    resultArray.push(item);
                }
            }, function () {
                db.close();
                len = resultArray.length;
                var tmp;

                while (len - 1 > 0) {
                    var k = 0;
                    while (resultArray[k + 1]) {
                        if (resultArray[k].nb_match < resultArray[k + 1].nb_match) {
                            tmp = resultArray[k];
                            resultArray[k] = resultArray[k + 1];
                            resultArray[k + 1] = tmp;
                        }
                        k++;
                    }
                    len--;
                }

                var i = 0;
                var newTab = [];
                var newTab2 = [];
                while (resultArray[i] && resultArray[i].nb_match > 0) {
                    newTab[i] = resultArray[i].user;
                    i++;
                }
                while (resultArray[i]) {
                    newTab2[i] = resultArray[i].user;
                    i++;
                }
                // console.log(newTab);
                // console.log(newTab2);

                if (!newTab[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, which: "tags " + req.body.tags});
            });
        });
    }
});

router.post('/popularite', requireLogin, function(req, res, next) {
    console.log(req.body.popu_min);
    console.log(req.body.popu_max);

    var resultArray = [];

    if (req.body.popu_min <= req.body.popu_max) {
        if (req.session.user.need != "Les deux") {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "popu": {"$gte": Number(req.body.popu_min), "$lte": Number(req.body.popu_max)},
                    "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                        },
                        $maxDistance:30000}}
                }).sort();
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    console.log("coucou");
                    if (String(doc._id) != String(req.session.user._id)
                        && req.session.user.ban.indexOf(String(doc._id)) == -1
                        && [req.session.user.sexe, "Les deux"].indexOf(doc.need) != -1 ) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    console.log(resultArray);
                    if (!resultArray[0])
                        res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                    else
                        res.render('filtred', {
                            items: resultArray,
                            which: "popu " + req.body.popu_min + " " + req.body.popu_max
                        });
                });
            });
        }
        else {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    "need" : {$in: ["Les deux", req.session.user.sexe]},
                    "popu": {"$gte": String(req.body.popu_min), "$lte": String(req.body.popu_max)},
                    "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                        },
                        $maxDistance:30000}}
                }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id) && req.session.user.ban.indexOf(String(doc._id)) == -1) {
                        resultArray.push(doc);
                    }
                }, function () {
                    db.close();
                    if (!resultArray[0])
                        res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                    else
                        res.render('filtred', {items: resultArray, which: "popu "
                        + req.body.popu_min + " "
                        + req.body.popu_max });
                });
            });
        }

    }
    else
        res.render('filtre');
});

module.exports = router;