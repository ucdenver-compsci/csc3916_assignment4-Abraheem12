var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const dbUrl = process.env.DB;

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

// Movie schema
const MovieSchema = new Schema({
    title: { type: String, required: true, index: true },
    releaseDate: Date,
    genre: {
        type: String,
        enum: [
            'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction'
        ],
    },
    actors: [{
        actorName: String,
        characterName: String,
    }],
});

// return the model
var Movie = mongoose.model('Movie', MovieSchema);
module.exports = Movie;

// Check if movies are already added and add if not present
Movie.countDocuments((err, count) => {
    if (err) {
        console.log('Error counting documents:', err);
    } else if (count === 0) {
        Movie.insertMany([
            {
                title: 'Die Hard',
                releaseDate: new Date(1988, 6, 15), // Remember months are 0-indexed in JS
                genre: 'Action',
                actors: [{ actorName: 'Bruce Willis', characterName: 'John McClane' }]
            },
            {
                title: 'Friday the 13th',
                releaseDate: new Date(1980, 4, 9),
                genre: 'Horror',
                actors: [{ actorName: 'Betsy Palmer', characterName: 'Pamela Voorhees' }]
            },
            {
                title: 'Casino',
                releaseDate: new Date(1995, 10, 22),
                genre: 'Drama',
                actors: [{ actorName: 'Robert De Niro', characterName: 'Sam "Ace" Rothstein' }]
            },
            {
                title: 'Goodfellas',
                releaseDate: new Date(1990, 8, 19),
                genre: 'Drama',
                actors: [{ actorName: 'Ray Liotta', characterName: 'Henry Hill' }]
            },
            {
                title: 'Rocky',
                releaseDate: new Date(1976, 10, 21),
                genre: 'Drama',
                actors: [{ actorName: 'Sylvester Stallone', characterName: 'Rocky Balboa' }]
            }
        ], (err) => {
            if (err) {
                console.log('Error inserting movies:', err);
            } else {
                console.log('Successfully inserted new movies');
            }
        });
    }
});
