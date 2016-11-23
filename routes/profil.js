var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var url = "mongodb://localhost:27017/test";

var multer  = require('multer');
var storage =  multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'public/images/');
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
})
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
    res.redirect('/profil/' + id);
});

router.post('/oui', function(req, res, next) {
    if (req.body.update && (req.session.user._id == req.body.id))
        var id = req.session.user._id + "/update";
    else
        var id = req.body.id;

    res.redirect('/profil/' + id);
});

router.get('/:id', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            /* Check pour data en dur + bouton vers route 'oui' */
            res.render('profil', {items: cursor, check: true});
        });
    });
});

router.get('/:id/update', function(req, res, next) {
    mongo.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('user-data').findOne({_id: objectId(req.params.id)}).then(function (cursor) {
            db.close();
            /* Check pour data en formulaire + bouton vers route 'update' */
            res.render('profil', {items: cursor, check: false});
        });
    });
});

router.post('/update', function(req, res, next) {
    var item = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        age: req.body.age,
        email: req.body.email,
        sexe: req.body.sexe,
        need: req.body.need,
        bio: req.body.bio,
        tags_str: "",
        tags: []
    };
    if (!item.need)
        item.need = "Les deux";

    var str = req.body.tags;
    var split = str.split(" ");
    console.log(split);
    var i = 0;
    while (split[i]) {
        split[i] = "#" + split[i];
        i++;
    }
    item.tags = split;
    item.tags_str = req.body.tags;
    var id = req.body.id;

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

module.exports = router;