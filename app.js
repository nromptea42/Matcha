var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars');

var routes = require('./routes/index');
var inscription = require('./routes/inscription');
var liste = require('./routes/liste');
var logout = require('./routes/logout');
var profil = require('./routes/profil');
var filtre = require('./routes/filtre');
var tri = require('./routes/tri');

var session = require('client-sessions');
var app = express();

// view engine setup
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname+ '/views'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public', express.static(__dirname + "/public"));

app.use(session({
  cookieName: 'session',
  secret: 'ptdr jrigole hehe',
  duration: 60 * 60 * 1000,
  activeDuration: 10 * 60 * 1000
}));

app.use('/', routes);
app.use('/inscription', inscription);
app.use('/liste', liste);
app.use('/logout', logout);
app.use('/profil', profil);
app.use('/filtre', filtre);
app.use('/tri', tri);

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


module.exports = app;
