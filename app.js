var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars');
var url = "mongodb://localhost:27017/test";
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');

var routes = require('./routes/index');
var inscription = require('./routes/inscription');
var liste = require('./routes/liste');
var logout = require('./routes/logout');
var profil = require('./routes/profil');
var filtre = require('./routes/filtre');
var tri = require('./routes/tri');
var recherche = require('./routes/recherche');
var visit = require('./routes/visit');
var message = require('./routes/message');
var notif = require('./routes/notif');

var session = require('client-sessions');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var escape = require('escape-html');

// view engine setup
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname+ '/views'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public', express.static(__dirname + "/public"));
app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(session({
    cookieName: 'session',
    secret: 'ptdr jrigole hehe',
    duration: 60 * 60 * 1000,
    activeDuration: 30 * 60 * 1000
}));

app.use(function(req, res, next) {
    res.io = io;
    next();
});

app.use('/', routes);
app.use('/inscription', inscription);
app.use('/liste', liste);
app.use('/logout', logout);
app.use('/profil', profil);
app.use('/filtre', filtre);
app.use('/tri', tri);
app.use('/recherche', recherche);
app.use('/visit', visit);
app.use('/message', message);
app.use('/notif', notif);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var o;

io.on('connection', function(client) {
    // console.log("connection");
    var userId;
    clearTimeout(o);

    client.on('which_user', function(id) {
        userId = id;
    });

    client.on('disconnect', function() {
        clearTimeout(o);
        o = setTimeout(function() {
            mongo.connect(url, function (err, db) {
                var d = new Date();
                db.collection('user-data').updateOne({"_id": objectId(userId)},
                    {$set: {connected: false, last_date: d.toUTCString()}}, function (err, result) {
                        console.log("deconnection");
                    });
            });
        }, 5000); // 5 seconds
    });

    client.on('chat message', function(msg) {
        // console.log(msg);
        clearTimeout(o);
        if (msg.msg && msg.exp && msg.dest) {
            mongo.connect(url, function (err, db) {
                db.collection('user-data').findOne({_id: objectId(msg.dest)}).then(function (cursor) {
                    if (cursor.ban.indexOf(String(msg.exp)) == -1) {
                        io.emit(msg.dest, {msg: "Vous avez un nouveau message !", chat: "here"});
                        io.emit(msg.exp + msg.dest, escape(msg.msg));
                        var new_item = {
                            message: msg.msg,
                            expe: msg.exp,
                            desti: msg.dest,
                            name: msg.name
                        };
                        db.collection('user-data').updateOne({"_id": objectId(msg.dest)}, {$inc: {nb_msg: 1}}, function (err, result) {
                            assert.equal(null, err);
                        });
                        db.collection('messages').insertOne(new_item, function (err, result) {
                            assert.equal(null, err);
                        });
                    }
                });
            });
        }
    });

    client.on('new visit', function(obj) {
        clearTimeout(o);
        if (obj.dest && obj.from && obj.name) {
            io.emit(obj.dest, {msg: "Votres profil a ete visite par " + obj.name});
            mongo.connect(url, function (err, db) {
                var new_item = {
                    message: "Votres profil a ete visite par " + obj.name,
                    expe: obj.from,
                    desti: obj.dest
                };
                db.collection('notifs').insertOne(new_item, function (err, result) {
                    assert.equal(null, err);
                    // db.close();
                });
                db.collection('user-data').updateOne({"_id": objectId(obj.dest)}, {$inc: {nb_notif: 1, popu: 1}}, function (err, result) {
                    // console.log("oui");
                });
            });
        }
    });

    client.on('new like', function(obj) {
        clearTimeout(o);
        if (obj.dest && obj.from && obj.name) {
            mongo.connect(url, function (err, db) {
                db.collection('user-data').findOne({_id: objectId(obj.dest)}).then(function (cursor) {
                    var new_item = {
                        message: "Vous avez ete like par " + obj.name,
                        expe: obj.from,
                        desti: obj.dest
                    };
                    if (cursor.ban.indexOf(String(obj.from)) == -1) {
                        if (cursor.liked.indexOf(String(obj.from)) == -1)
                            io.emit(obj.dest, {msg: "Vous avez ete like par " + obj.name});
                        else {
                            new_item.message = "Vous avez matche avec " + obj.name;
                            io.emit(obj.dest, {msg: "Vous avez matché avec " + obj.name});
                        }
                        db.collection('notifs').insertOne(new_item, function (err, result) {
                            assert.equal(null, err);
                            // console.log('Item inserted');
                            db.close();
                        });
                        db.collection('user-data').updateOne({"_id": objectId(obj.dest)}, {
                            $inc: {
                                nb_notif: 1,
                                popu: 5
                            }
                        }, function (err, result) {
                            // console.log("oui");
                        });
                    }
                });
            });
        }
    });

    client.on('new unlike', function(obj) {
        clearTimeout(o);
        if (obj.dest && obj.from && obj.name) {
            mongo.connect(url, function (err, db) {
                db.collection('user-data').findOne({_id: objectId(obj.dest)}).then(function (cursor) {
                    if (cursor.ban.indexOf(String(obj.from)) == -1) {
                        io.emit(obj.dest, {msg: "Vous avez ete unlike par " + obj.name});
                        var new_item = {
                            message: "Vous avez ete unlike par " + obj.name,
                            expe: obj.from,
                            desti: obj.dest
                        };
                        db.collection('notifs').insertOne(new_item, function (err, result) {
                            assert.equal(null, err);
                            // console.log('Item inserted');
                            db.close();
                        });
                        db.collection('user-data').updateOne({"_id": objectId(obj.dest)}, {
                            $inc: {
                                nb_notif: 1,
                                popu: -3
                            }
                        }, function (err, result) {
                            // console.log("oui");
                        });
                    }
                });
            });
        }
    });
});

module.exports = {app: app, server: server};
