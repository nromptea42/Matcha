var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

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

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    res.render('filtre');
});

router.post('/age', function(req, res, next) {
    console.log(req.body.age_min);
    console.log(req.body.age_max);

    var where;
    var resultArray = [];
    var resultArray2 = [];
    if (req.session.user.location)
        where = req.session.user.location;
    else
        where = req.session.user.hidden_location;
    if (req.body.age_min <= req.body.age_max) {
        if (req.session.user.need != "Les deux") {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)}, "location": where
                }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                        resultArray.push(doc);
                    }
                }, function () {
                    var cursor = db.collection('user-data').find({
                        sexe: req.session.user.need,
                        "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)},
                        "location": {$ne: where}
                    })
                        .sort({_id: -1});
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                            resultArray2.push(doc);
                        }
                    }, function () {
                        db.close();
                        if (!resultArray[0] && !resultArray2[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {
                                items: resultArray,
                                maybe: resultArray2,
                                which: "age " + req.body.age_min + " " + req.body.age_max
                            });
                    });
                });
            });
        }
        else {
            console.log("oui");
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    "need" : {$in: ["Les deux", req.session.user.sexe]},
                    "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)},
                    "location": where
                }).sort({_id: -1});
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id)) {
                        resultArray.push(doc);
                    }
                }, function () {
                    var cursor = db.collection('user-data').find({
                        "need" : {$in: ["Les deux", req.session.user.sexe]},
                        "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)},
                        "location": {$ne: where}
                    }).sort({_id: -1});
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if (String(doc._id) != String(req.session.user._id)) {
                            resultArray2.push(doc);
                        }
                    }, function () {
                        db.close();
                        if (!resultArray[0] && !resultArray2[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {items: resultArray, maybe: resultArray2, which: "age " + req.body.age_min + " " + req.body.age_max });
                    });
                });
            });
        }

    }
    else
        res.render('filtre');
});

router.post('/region', function(req, res, next) {
    console.log(req.body.zip);
    var where;
    var resultArray = [];
    var resultArray2 = [];

    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            http.get({
                'host': 'maps.googleapis.com',
                'path': '/maps/api/geocode/json?address=' + req.body.zip + ",%20France"
            }, function (resp) {
                resp.on('data', function (maps_infos) {
                    var y = JSON.parse(maps_infos);
                    // console.log(y);
                    console.log(y.results[0].address_components[3].long_name);
                    where = y.results[0].address_components[3].long_name;
                    var cursor = db.collection('user-data').find({
                        sexe: req.session.user.need,
                        "location": where
                    }).sort({_id: -1});
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                            resultArray.push(doc);
                        }
                    }, function () {
                        var cursor = db.collection('user-data').find({
                            sexe: req.session.user.need,
                            "age": {
                                "$gte": String(Number(req.session.user.age - 5)),
                                "$lte": String(Number(req.session.user.age + 5))
                            },
                            "location": {$ne: where}
                        })
                            .sort({_id: -1});
                        cursor.forEach(function (doc, err) {
                            assert.equal(null, err);
                            if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                                resultArray2.push(doc);
                            }
                        }, function () {
                            db.close();
                            if (!resultArray[0] && !resultArray2[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, maybe: resultArray2, which: "region " + req.body.zip});
                        });
                    });
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
                    console.log(y.results[0].address_components[3].long_name);
                    where = y.results[0].address_components[3].long_name;
                    var cursor = db.collection('user-data').find({
                        "need" : {$in: ["Les deux", req.session.user.sexe]},
                        "location": where
                    }).sort({_id: -1});
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if (String(doc._id) != String(req.session.user._id)) {
                            resultArray.push(doc);
                        }
                    }, function () {
                        var cursor = db.collection('user-data').find({
                            "need" : {$in: ["Les deux", req.session.user.sexe]},
                            "age": {
                                "$gte": String(Number(req.session.user.age - 5)),
                                "$lte": String(Number(req.session.user.age + 5))
                            },
                            "location": {$ne: where}
                        })
                            .sort({_id: -1});
                        cursor.forEach(function (doc, err) {
                            assert.equal(null, err);
                            if (String(doc._id) != String(req.session.user._id)) {
                                resultArray2.push(doc);
                            }
                        }, function () {
                            db.close();
                            if (!resultArray[0] && !resultArray2[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, maybe: resultArray2, which: "region " + req.body.zip});
                        });
                    });
                });
            });
        });
    }
});

router.post('/tags', function(req, res, next) {
    // console.log(req.body.tags);
    splited = req.body.tags.split(" ");
    // var i = 0;
    // while (splited[i])
    //     console.log(splited[i++]);
    // console.log(req.session.user.tags_str.split(" "));

    var resultArray = [];
    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            var cursor = db.collection('user-data').find({
                sexe: req.session.user.need
            }).sort({_id: -1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if (String(doc._id) != String(req.session.user._id)) {
                    var i = 0;
                    var nb = 0;
                    var tag_split = doc.tags_str.split(" ");
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

                if (!resultArray[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, maybe: newTab2, which: "tags " + req.body.tags});
            });
        });
    }
    else {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            var cursor = db.collection('user-data').find({
                "need" : {$in: ["Les deux", req.session.user.sexe]}
            }).sort({_id: -1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if (String(doc._id) != String(req.session.user._id)) {
                    var i = 0;
                    var nb = 0;
                    var tag_split = doc.tags_str.split(" ");
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

                if (!resultArray[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, maybe: newTab2, which: "tags " + req.body.tags});
            });
        });
    }
});

module.exports = router;