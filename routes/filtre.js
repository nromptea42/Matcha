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
router.get('/', function(req, res, next) {
    res.render('filtre');
});

router.post('/age', function(req, res, next) {
    console.log(req.body.age_min);
    console.log(req.body.age_max);

    var where;
    var resultArray = [];
    var resultArray2 = [];

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        if (req.session.user.location)
            where = req.session.user.location;
        else
            where = req.session.user.hidden_location;

        var cursor = db.collection('user-data').find({
            sexe: req.session.user.need,
            "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max)}, "location": where }).sort({_id: -1});
        cursor.forEach(function (doc, err) {
            assert.equal(null, err);
            if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                resultArray.push(doc);
            }
        }, function () {
            var cursor = db.collection('user-data').find({
                    sexe: req.session.user.need,
                    "age": {"$gte": String(req.body.age_min), "$lte": String(req.body.age_max) },
                    "location" : {$ne: where } })
                .sort({_id: -1});
            cursor.forEach(function (doc, err) {
                assert.equal(null, err);
                if ((String(doc._id) != String(req.session.user._id)) && (doc.need == req.session.user.sexe)) {
                    resultArray2.push(doc);
                }
            }, function () {
                db.close();
                if (!resultArray[0] && !resultArray2[0])
                    res.render('filtred', {msg: "Je n'ai trouve personne pour vous :("});
                else
                    res.render('filtred', {items: resultArray, maybe: resultArray2});
            });
        });
    });
});

router.post('/region', function(req, res, next) {
    console.log(req.body.zip);
    var where;
    var resultArray = [];
    var resultArray2 = [];

    mongo.connect(url, function (err, db) {
        assert.equal(null, err);

        http.get({ 'host': 'maps.googleapis.com',
            'path': '/maps/api/geocode/json?address=' + req.body.zip + ",%20France" }, function (resp) {
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
                            res.render('filtred', {msg: "Je n'ai trouve personne pour vous :("});
                        else
                            res.render('filtred', {items: resultArray, maybe: resultArray2});
                    });
                });
            });
        });
    });
});

module.exports = router;