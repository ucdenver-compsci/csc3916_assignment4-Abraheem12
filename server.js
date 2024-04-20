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
var crypto = require('crypto');
constant fetch = require('node-fetch');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());


var router = express.Router();

const measurement_id = process.env.measurementprotocol_id; //load up the measure id from the .env file 
const apiKey = process.env.API_KEY;// load up the api that i created in google analytics

console.log(`Loaded Measurement Protocol ID: ${process.env.measurement_id}`);
console.log(`Loaded API Key: ${process.env.apiKey}`);

// function to sent an event to GA4
async function sendEventToGA4(eventName, params) {
    const payload = {
        client_id: crypto.randomBytes(16).toString("hex"), 
        events: [{
            name: eventName,
            params: params,
        }],
    };

    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${apiKey}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Failed to send an event to GA4. Status: ${response.status}`);
    }

    console.log('Event sent to GA4 success.');
}

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

router.route('/movies/:id?') 
    .get((req, res) => {
        let query = {};
        // Check to see if the ID was provided 
        if (req.params.id) {
            let id;
            try {
                // converting to objectID if we can
                id = mongoose.Types.ObjectId(req.params.id); 
            } catch (error) {
                // Use as string if the conversion does not go
                id = req.params.id; 
            }
            // We can either movies/title or movie/ID
            query = { $or: [{ _id: id }, { title: id }] }; 
        } else if (req.query.title) {
            query.title = req.query.title;
        }
        if (req.query.reviews === 'true') {
            Movie.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: "reviews",
                        localField: "_id",
                        foreignField: "movieId",
                        as: "reviews"
                    }
                }
            ]).exec(function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    //handle any amount of movies
                    res.json(result); 
                }
            });
        } else {
            Movie.find(query, (err, result) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.json(result); 
            });
        }
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

        });
    }
    })
    .all((req, res) => {
        res.status(405).send({ status: 405, message: 'HTTP method not supported.' });
    });

    router.get('/reviews', function (req, res) {
        // Check if the request has a movieId query parameter
        if (req.query.movieId) {
            console.log("it hit the get with id");
            // Extract movieId from query parameter and trim whitespace
            let movieId = req.query.movieId.trim();
            console.log("it hit movieId", movieId)
            Review.find({ movieId: movieId }, function (err, reviews) {
                if (err) {
                    return res.status(500).send(err);
                }
                // Log the number of reviews found
                console.log("length of the review", reviews.length)
                return res.status(200).json(reviews);
            });
        } else if (req.query.reviewId) {
            // If the request has a reviewId query parameter
            let reviewId = req.query.reviewId.trim();
            Review.findById(reviewId, function (err, review) {
                if (err) {
                    return res.status(500).send(err);
                }
                return res.status(200).json(review);
            });
        } else {
            // If no query parameters are provided, return all reviews
            Review.find(function (err, reviews) {
                if (err) {
                    return res.status(500).send(err);
                }
                return res.status(200).json(reviews);
            });
        }
    });

  
router.route('/reviews')
    .post(authJwtController.isAuthenticated, (req, res) => {
        console.log('Received POST request for reviews:', req.body);
        if (!req.body.username || !req.body.review || !req.body.rating || !req.body.movieID) {
            res.status(400).json({ success: false, msg: 'Please include all required fields: review, rating, movieID.' });
        } else {
            Movie.findById(req.body.movieID, (err, movie) => {
                if (err) {
                    res.status(500).send(err);
                } else if (!movie) {
                    res.status(404).json({ success: false, msg: 'Movie not found.' });
                } else {
                    var review = new Review();
                    review.username = req.body.username;
                    review.rating = req.body.rating;
                    review.movieID = req.body.movieID;
                    review.review = req.body.review;

                    console.log('Review item:', review);

                    review.save((err) => {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.status(200).json({ success: true, msg: 'Created a review.' });
                            sendEventToGA4('review', getJSONObjectForMovieRequirement(req));
                            return res.status(201).json({ message: 'Review created!' });
                        }
                    }); 
                }
            }); 
        }
    }) 

        .delete(authJwtController.isAuthenticated, (req, res) => {
            console.log("Received DELETE request for reviews with following item: ", req.body)
            // Assuming you want to delete reviews based on their IDs, not movie titles
            if (!req.body.reviewID) {
                res.status(400).json({ success: false, msg: 'Review ID is required for deletion.' });
            } else {
                Review.findOneAndDelete({ _id: req.body.reviewID }, (err) => {
                    if (err) {
                        res.status(500).send(err);
                    }
                    else {
                        res.json({ success: true, msg: 'Successfully deleted review.' });
                    }
                });
            }
        });

    
    


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only