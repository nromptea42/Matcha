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

function get_index(req, res) {
    var resultArray = [];
    var need = req.session.user.need;
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        var range_min = req.session.user.age - 5;
        // console.log(range_min);
        var range_max = Number(req.session.user.age) + 5;
        // console.log(range_max);
        var where;
        if (req.session.user.location)
            where = req.session.user.location;
        else
            where = req.session.user.hidden_location;

        var cursor = db.collection('user-data').find({sexe: need,
            "age" : { "$gte": String(range_min), "$lte": String(range_max) }, "location" : where }).sort({age: 1});
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

function get_age(req, res, age_min, age_max) {
    var where;
    var resultArray = [];
    var resultArray2 = [];

    if (age_min <= age_max) {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            if (req.session.user.location)
                where = req.session.user.location;
            else
                where = req.session.user.hidden_location;

            var cursor = db.collection('user-data').find({
                sexe: req.session.user.need,
                "age": {"$gte": String(age_min), "$lte": String(age_max)}, "location": where
            }).sort({age: 1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                    resultArray.push(doc);
                }
            }, function () {
                var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "age": {"$gte": String(age_min), "$lte": String(age_max)},
                    "location": {$ne: where}
                })
                    .sort({age: 1});
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
                        res.render('filtred', {items: resultArray, maybe: resultArray2, which: "age " + age_min + " " + age_max });
                });
            });
        });
    }
    else
        res.render('filtre');
}

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('filtre');
});

router.post('/age', function(req, res, next) {
    var array = req.body.which.split(" ");
    console.log(array);

    if (array[0] == "none")
        res.redirect('/');
    else if (array[0] == "index") {
        get_index(req, res);
    }
    else if (array[0] == "age") {
        get_age(req, res, array[1], array[2]);
    }
    else if (array[0] == "tags") {

    }
});

module.exports = router;