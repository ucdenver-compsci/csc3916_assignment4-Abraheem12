/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

require('dotenv').config();
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
        console.log('Received GET request for movies:');
        Movie.find({}, (err, movies) => {
            if (err) {
                return res.status(500).send(err);
            }
            else {
                res.status(200).json(movies);
            }
        });
    })
        
    .post((req, res) => {
        console.log('Received POST request for movies:', req.body);
        if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors || req.body.actors.length === 0) {
            res.status(400).json({ success: false, msg: 'Please include all required fields: title, releaseDate, genre, and actors.' });
        } else {
            var movie = new Movie();
            movie.title = req.body.title;
            movie.releaseDate = req.body.releaseDate;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;

            console.log('Movie item:', movie);

            movie.save((err) => {
                if (err) {
                    res.status(500).send(err);
                }
                else {
                    res.status(200).json({ success: true, msg: 'Successfully created new movie.' });
                }
            });
        }
    })
    .all((req, res) => {
        res.status(405).send({ status: 405, message: 'HTTP method not supported.' });
    });

    
router.route('/movies/:title')
    .put(authJwtController.isAuthenticated, (req, res) => {
        console.log("Received PUT request with following item: ", req.body)
        if (!req.params.title) {
            res.status(400).json({ success: false, msg: 'Movie title does not exist in the endpoint.' });
        }
        else {
            const title = req.params.title;
        
            Movie.findOneAndUpdate({ title: title }, req.body, { new: true }, (err, movie) => {
                if (err) { 
                    res.status(500).send(err);
                }
                else {
                    res.status(200).json({ success: true, msg: 'Successfully updated movie.' });
                }

        });}
    })
    .delete(authController.isAuthenticated, (req, res) => {
        console.log("Received DELETE request with following item: ", req.body)
        if (!req.params.title) {
            res.status(400).json({ success: false, msg: 'Movie title does not exist in the endpoint.' });
        }

        else {
            const title = req.params.title;

        Movie.findOneAndDelete({ title: req.body.title }, (err) => {
            if (err) {
                res.status(500).send(err);
            }
            else {
                res.json({ success: true, msg: 'Successfully deleted movie.' });
            }
            
        });}
    })
    .all((req, res) => {
        res.status(405).send({ status: 405, message: 'HTTP method not supported.' });
    });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only