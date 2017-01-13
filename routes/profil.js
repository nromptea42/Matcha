var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";
var http = require('http');
var S = require('string');

var multer  = require('multer');
var storage =  multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'public/images/');
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});
var upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1000 * 1000 },
    fileFilter: function (req, file, cb) {
        if (regex_img(file.mimetype) == "ko") {
            return cb(null, false, new Error('goes wrong on the mimetype'));
        }
        else {
            cb(null, true);
        }

    }
});

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
};

function regex_img(value) {
    var regex1 = /^image\/(jpg|jpeg|png)/;
    var match1 = regex1.test(value);
    if (match1)
        return ("ok");
    else
        return ("ko");
}

/* GET home page. */
router.get('/', requireLogin, function(req, res, next) {
    var id = req.session.user._id;
    console.log(req.session.user);
    res.redirect('/profil/' + id);
});

router.post('/oui', requireLogin, function(req, res, next) {
    if (req.body.update && (req.session.user._id == req.body.id))
        var id = req.session.user._id + "/update";
    else
        var id = req.body.id;

    res.redirect('/profil/' + id);
});

router.get('/:id', requireLogin, function(req, res, next) {
    if (req.params.id == req.session.user._id) {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
                db.close();
                /* Check pour data en dur + bouton vers route 'oui' */
                res.render('profil', {items: cursor, check: true});
            });
        });
    }
    else
        res.redirect('/visit/' + req.params.id);
});

router.get('/:id/update', requireLogin, function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            var tab_tags = [];
            var tags = db.collection('tags').find();
            tags.forEach(function (doc, err) {
                tab_tags.push(doc.name);
            }, function () {
                db.close();
                /* Check pour data en formulaire + bouton vers route 'update' */
                res.render('profil', {items: cursor, check: false, tab_tags: tab_tags});
            });
        });
    });
});

router.post('/update', requireLogin, function(req, res, next) {
    var item = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age,
        email: req.body.email,
        sexe: req.body.sexe,
        need: req.body.need,
        bio: req.body.bio,
        ville: "",
        location: { type: "Point", coordinates: [] }
    };
    if (!item.need)
        item.need = "Les deux";
    var id = req.body.id;
    check = "yes";

    if (!req.body.location) {
        item.ville = "paris";
        check = "no";
    }
    else {
        item.ville = S(req.body.location).slugify().s;
    }

    console.log(item.ville);
    http.get({'host': 'maps.googleapis.com',
        'path': '/maps/api/geocode/json?address=' + item.ville + ",%20France"}, function(resp) {
        resp.on('data', function(maps_infos) {
            var y = JSON.parse(maps_infos);
            if (y.status == "OK") {
                if (item.ville) {
                    if (check == "no")
                        item.ville = "";
                    else
                        item.ville = y.results[0].address_components[0].long_name;
                    item.location.coordinates = [Number(y.results[0].geometry.location.lng), Number(y.results[0].geometry.location.lat)]
                }

                if (!isNaN(item.age)) {
                    if (Number(item.age) >= 18) {
                        mongo.connect(url, function (err, db) {
                            assert.equal(null, err);
                            db.collection('user-data').updateOne({"_id": objectId(id)}, {$set: item}, function (err, result) {
                                assert.equal(null, err);
                                console.log('Item updated');
                                db.close();
                            });
                        });
                    }
                }
                res.redirect('/profil/' + id);
            }
            else
                res.redirect('/profil/' + id + "/update");
        });
    });
});

router.post('/add_photo', upload.single('photo'), function(req, res, next) {
    var item = {
        src_img: req.session.user.src_img,
        nb_img: 0
    };
    if (req.file) {
        var i = req.session.user.nb_img;
        if (req.body.which) {
            if (i === 0) {
                item.src_img[0] = "/" + req.file.path;
                item.nb_img = 1;
                // console.log("Je suis 0");
            }
            else if (i < 5) {
                item.src_img.push("/" + req.file.path);
                item.nb_img = i + 1;
                // console.log("Je suis autre chose que 0 mais inferieur a 5");
            }
            else {
                var oui = req.body.which;
                item.src_img[oui - 1] = "/" + req.file.path;
                item.nb_img = 5;
                // console.log("Je suis 5");
            }
            mongo.connect(url, function (err, db) {
                assert.equal(null, err);
                db.collection('user-data').updateOne({"_id": objectId(req.body.id)}, {$set: item}, function (err, result) {
                    assert.equal(null, err);
                    console.log('Item updated');
                    db.close();
                });
            });
            // console.log(req.file);
        }
    }
    res.redirect('/profil/' + req.body.id);
});

router.post('/tags', requireLogin, function(req,res, next) {
    var item = {
        name: ""
    };

    var check = false;
    if (req.body.tags) {
        mongo.connect(url, function (err, db) {
            assert.equal(null, err);
            db.collection('user-data').findOne({_id: objectId(req.body.id)}).then(function (user) {
                var thing = {
                    tags: user.tags
                };
                var cursor = db.collection('tags').find();
                cursor.forEach(function (doc, err) {
                    if (req.body.tags == doc.name)
                        check = true;
                }, function () {
                    if (!check) {
                        item.name = req.body.tags;
                        db.collection('tags').insertOne(item, function (err, result) {
                            assert.equal(null, err);
                            console.log('Item inserted');
                            db.close();
                        });
                    }
                    thing.tags.push(req.body.tags);
                    db.collection('user-data').updateOne({"_id": objectId(req.body.id)}, {$set: thing}, function (err, result) {
                        assert.equal(null, err);
                        console.log('Item updated');
                        db.close();
                    });
                    res.redirect('/profil/' + req.body.id + "/update");
                });
            });
        });
    }
    else
        res.redirect('/profil/' + req.body.id);
});

router.post('/del_tags', requireLogin, function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.session.user._id)}).then(function (user) {
            var thing = {
                tags: user.tags
            };
            var index = thing.tags.indexOf(req.body.tag);
            if (index > -1)
                thing.tags.splice(index, 1);
            db.collection('user-data').updateOne({"_id": objectId(req.session.user._id)}, {$set: thing}, function (err, result) {
                assert.equal(null, err);
                console.log('Item updated');
                db.close();
            });
            res.redirect('/profil/' + req.session.user._id + "/update");
        });
    });
});

module.exports = router;