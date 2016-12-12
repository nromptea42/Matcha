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

function get_index(req, res, sort) {
    var resultArray = [];
    var need = req.session.user.need;

    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            var cursor = db.collection('user-data').find({
                sexe: need,
                "location": { $near: { $geometry:
                {
                    type:"Point",
                    coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                },
                    $maxDistance:30000}}
            }).sort(sort);
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
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
            }).sort(sort);
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if (String(doc._id) != String(req.session.user._id)) {
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

function get_age(req, res, age_min, age_max, sort) {
    var where;
    var resultArray = [];
    var resultArray2 = [];

    if (age_min <= age_max) {
        if (req.session.user.need != "Les deux") {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "age": {"$gte": String(age_min), "$lte": String(age_max)},
                    "location": { $near: { $geometry:
                    {
                        type:"Point",
                        coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                    },
                        $maxDistance:30000}}
                }).sort(sort);
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                        resultArray.push(doc);
                    }
                }, function () {
                        db.close();
                        if (!resultArray[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {
                                items: resultArray,
                                which: "age " + age_min + " " + age_max
                            });
                    });
                });
        }
        else {
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);

                var cursor = db.collection('user-data').find({
                    "need" : {$in: ["Les deux", req.session.user.sexe]},
                    "age": {"$gte": String(age_min), "$lte": String(age_max)},
                    "location": { $near: { $geometry:
                    {
                        type:"Point",
                        coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                    },
                        $maxDistance:30000}}
                }).sort(sort);
                cursor.forEach(function (doc, err) {
                    assert.equal(null, err);
                    if (String(doc._id) != String(req.session.user._id)) {
                        resultArray.push(doc);
                    }
                }, function () {
                        db.close();
                        if (!resultArray[0])
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                        else
                            res.render('filtred', {
                                items: resultArray,
                                which: "age " + age_min + " " + age_max
                            });
                    });
                });
        }

    }
    else
        res.render('filtre');
}

function get_tags(req, res, str, sort) {
    var splited = str.split(" ");
    console.log(splited);

    var resultArray = [];
    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            var cursor = db.collection('user-data').find({
                sexe: req.session.user.need,
                "location": { $near: { $geometry:
                {
                    type:"Point",
                    coordinates:[req.session.user.location.coordinates[0], req.session.user.location.coordinates[1]]
                },
                    $maxDistance:50000}}
            }).sort(sort);
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
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
                    if (nb > 0)
                        resultArray.push(item);
                }
            }, function () {
                db.close();
                var i = 0;
                var newTab = [];
                // var newTab2 = [];
                while (resultArray[i] && resultArray[i].nb_match > 0) {
                    newTab[i] = resultArray[i].user;
                    i++;
                }

                if (!resultArray[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, which: "tags " + str});
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
            }).sort(sort);
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
                    if (nb > 0)
                        resultArray.push(item);
                }
            }, function () {
                db.close();
                var i = 0;
                var newTab = [];
                // var newTab2 = [];
                while (resultArray[i] && resultArray[i].nb_match > 0) {
                    newTab[i] = resultArray[i].user;
                    i++;
                }

                if (!resultArray[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                else
                    res.render('filtred', {items: newTab, which: "tags " + str});
            });
        });
    }
}

function get_region(req, res, zip, sort) {
    var resultArray = [];
    var resultArray2 = [];

    if (req.session.user.need != "Les deux") {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);

            http.get({
                'host': 'maps.googleapis.com',
                'path': '/maps/api/geocode/json?address=' + zip + ",%20France"
            }, function (resp) {
                resp.on('data', function (maps_infos) {
                    var y = JSON.parse(maps_infos);
                    // console.log(y);
                    var cursor = db.collection('user-data').find({
                        sexe: req.session.user.need,
                        "location": { $near: { $geometry:
                        {
                            type:"Point",
                            coordinates:[Number(y.results[0].geometry.location.lng), Number(y.results[0].geometry.location.lat)]
                        },
                            $maxDistance:30000}}
                    }).sort(sort);
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                            resultArray.push(doc);
                        }
                    }, function () {
                            db.close();
                            if (!resultArray[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, which: "region"});
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
                'path': '/maps/api/geocode/json?address=' + zip + ",%20France"
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
                    }).sort(sort);
                    cursor.forEach(function (doc, err) {
                        assert.equal(null, err);
                        if (String(doc._id) != String(req.session.user._id)) {
                            resultArray.push(doc);
                        }
                    }, function () {
                            db.close();
                            if (!resultArray[0])
                                res.render('filtred', {msg: "Je n'ai trouve personne pour vous :(", which: "none"});
                            else
                                res.render('filtred', {items: resultArray, maybe: resultArray2, which: "region " + zip});
                        });
                    });
                });
            });
    }
}

function tags_sort (req, res, sort, age_min, age_max, yes) {
    splited = req.session.user.tags_str.split(" ");
    // var i = 0;
    // while (splited[i])
    //     console.log(splited[i++]);
    // console.log(req.session.user.tags_str.split(" "));

    var resultArray = [];
    var range_min = age_min;
    // console.log(range_min);
    var range_max = age_max;
    // console.log(range_max);
    var where;
    if (req.session.user.location)
        where = req.session.user.location;
    else
        where = req.session.user.hidden_location;

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);

        var cursor = db.collection('user-data').find({sexe: req.session.user.need,
            "age" : { "$gte": String(range_min), "$lte": String(range_max) }, "location" : where }).sort(sort);
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                var i = 0;
                var nb = 0;
                var tag_split = doc.tags_str.split(" ");
                // console.log(tag_split);
                while (splited[i]) {
                    var j = 0;
                    while (tag_split[j])
                    {
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
                res.render('filtred', {items: newTab, which: yes});
        });
    });
}

function do_bad_things (req, res, str) {
    // console.log(req.body.tags);
    splited = str.split(" ");
    // var i = 0;
    // while (splited[i])
    //     console.log(splited[i++]);
    // console.log(req.session.user.tags_str.split(" "));

    var resultArray = [];

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);

        var cursor = db.collection('user-data').find({
            sexe: req.session.user.need}).sort({_id: -1});
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                var i = 0;
                var nb = 0;
                var tag_split = doc.tags_str.split(" ");
                // console.log(tag_split);
                while (splited[i]) {
                    var j = 0;
                    while (tag_split[j])
                    {
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
                res.render('filtred', {items: newTab, maybe: newTab2, which: "tags " + str});
        });
    });
}


/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    res.render('filtre');
});

router.post('/age', function(req, res, next) {
    var array = req.body.which.split(" ");
    console.log(array);
    var sort = {age: 1};

    if (array[0] == "none")
        res.redirect('/');
    else if (array[0] == "index") {
        get_index(req, res, sort);
    }
    else if (array[0] == "age") {
        get_age(req, res, array[1], array[2], sort);
    }
    else if (array[0] == "tags") {
        var len = array.length;
        var i = 1;
        var str = "";
        while (array[i]) {
            if (i == len - 1)
                str = str + array[i] + " ";
            else
                str = str + array[i] + " ";
            i++;
        }
        get_tags(req, res, str, sort);
    }
    else if (array[0] == "region") {
        get_region(req, res, array[1], sort);
    }
    else
        res.redirect('/');
});

router.post('/tags', function(req, res, next) {
    var array = req.body.which.split(" ");
    console.log(array);
    var sort = {id: -1}
    var age_min = req.session.user.age - 5;
    var age_max = Number(req.session.user.age) + 5;

    if (array[0] == "none")
        res.redirect('/');
    else if (array[0] == "index") {
        tags_sort(req, res, sort, age_min, age_max, "index");
    }
    else if (array[0] == "age") {
        tags_sort(req, res, sort, array[1], array[2], "age " + array[1] + " " + array[2]);
    }
    else if (array[0] == "tags") {
        var len = array.length;
        var i = 1;
        var str = "";
        while (array[i]) {
            if (i == len - 1)
                str = str + array[i] + " ";
            else
                str = str + array[i] + " ";
            i++;
        }
        do_bad_things(req, res, str);
    }
    else
        res.redirect('/');
});

module.exports = router;