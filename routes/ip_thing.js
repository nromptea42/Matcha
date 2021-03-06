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
router.get('/', requireLogin, function(req, res, next) {

    http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
        resp.on('data', function(ip) {
            console.log("My public IP address is: " + ip);
            http.get({'host': 'freegeoip.net', 'port': 80, 'path': '/json/' + ip}, function(resp) {
                resp.on('data', function(infos) {
                    var x = JSON.parse(infos);
                    console.log(x.zip_code);
                    http.get({'host': 'maps.googleapis.com',
                        'path': '/maps/api/geocode/json?address=' + x.zip_code + ",%20France"}, function(resp) {
                        resp.on('data', function(maps_infos) {
                            var y = JSON.parse(maps_infos);
                            console.log(y);
                            // console.log(y.results[0].address_components[3].long_name);
                            res.render('liste');
                        });
                    });
                });
            });
        });
    });
});