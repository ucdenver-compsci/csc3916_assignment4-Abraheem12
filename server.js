/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    console.log('Received signup request:', req.body);
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/movies')
    .get((req, res) => {
        Movie.find({}, 'title releaseDate genre actors -__v', (err, movies) => {
            // The '-__v' excludes the __v field from the results.
            if (err) {
                return res.status(500).send(err);
            }
            res.json(movies);
        });

        
    })
        
    .post((req, res) => {
        if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors) {
            res.json({ success: false, msg: 'Please include all required fields: title, releaseDate, genre, and actors.' });
        } else {
            var movie = new Movie();
            movie.title = req.body.title;
            movie.releaseDate = req.body.releaseDate;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;

            movie.save((err) => {
                if (err) res.status(500).send(err);
                res.json({ success: true, msg: 'Successfully created new movie.' });
            });
        }
    })
    .put(authJwtController.isAuthenticated, (req, res) => {
        Movie.findOneAndUpdate({ title: req.body.title }, req.body, { new: true }, (err, movie) => {
            if (err) res.status(500).send(err);
            res.json({ success: true, msg: 'Successfully updated movie.' });
        });
    })
    .delete(authController.isAuthenticated, (req, res) => {
        Movie.findOneAndDelete({ title: req.body.title }, (err) => {
            if (err) res.status(500).send(err);
            res.json({ success: true, msg: 'Successfully deleted movie.' });
        });
    })
    .all((req, res) => {
        res.status(405).send({ status: 405, message: 'HTTP method not supported.' });
    });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


