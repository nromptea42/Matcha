var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');

/* GET home page. */
router.get('/', function(req, res, next) {
    req.session.reset();
    res.redirect('/');
});

module.exports = router;