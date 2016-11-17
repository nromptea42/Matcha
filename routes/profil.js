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
        email: req.body.email
    };
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
      src_img: ""
    };
    if (req.file) {
        console.log(req.file);
        item.src_img = "/" + req.file.path;
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
    res.redirect('/profil/' + req.body.id);
});

module.exports = router;