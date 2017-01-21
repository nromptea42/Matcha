var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
};

var http = require('http');

/* GET home page. */
// router.get('/', requireLogin, function(req, res, next) {
//     var resultArray = [];
//     mongo.connect(url, function (err, db) {
//         assert.equal(null, err);
//         var cursor = db.collection('user-data').find().sort({_id: -1});
//         cursor.forEach(function (doc, err) {
//             assert.equal(null, err);
//             resultArray.push(doc);
//         }, function () {
//             db.close();
//             res.render('liste', {items: resultArray});
//         });
//     });
// });
//
// router.post('/delete', function(req, res, next) {
//     var id = req.body.id;
//     mongo.connect(url, function (err, db) {
//         assert.equal(null, err);
//         db.collection('user-data').deleteOne({"_id": objectId(id)}, function (err, result) {
//             assert.equal(null, err);
//             console.log('Item deleted');
//             db.close();
//             res.redirect('/liste');
//         });
//     });
// });

// ATTENTION VIRE MOI CETTE MERDE

module.exports = router;