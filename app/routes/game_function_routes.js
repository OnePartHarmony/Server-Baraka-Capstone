// pull in Mongoose model for games
const Game = require('../models/game')
const Territory = require('../models/territory')
const Unit = require('../models/unit')
const Player = require('../models/player')
// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

const { unitStats, orderOfSeasons } = require('../constants')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404

const initializeMap = require('../scripts/scripts')
const adjacents = require('../constants')



// Script for adding a player to a game and randomly assigning a season
const addPlayer = (roomId, userId) => {
    let availableSeasons = orderOfSeasons.slice()
    let randIndex
    // First, we find the game
    Game.findOne({ roomId: roomId })
        .then(game => {
            orderOfSeasons.forEach(season => {
                if (game.allSeasons.includes(season)) {
                    let index = availableSeasons.indexOf(season)
                    availableSeasons.splice(index, 1)        
                }
            })
            randIndex = Math.floor(Math.random() * availableSeasons.length)
            return game
        })
        .then(game => {
            // then we create the player...
            Player.create({user: userId, season: availableSeasons[randIndex]})
                .then(player => {
                        // and modify the game document to add the player to the game and the season to the list of seasons in game
                        game.players.push(player._id)
                        game.allSeasons.push(availableSeasons[randIndex])
                        return game.save()
                        })
                
                .then(game => {
                    if (game.players.length === game.numberOfPlayers) {
                        initializeGameBoard(game._id)
                    }
                })
            })
}


// CREATE
// POST /games
// router.post('/games', requireToken, (req, res, next) => {
// 	// set owner of new game to be current user
//     // req.body.game.players = [req.user.id]
// 	req.body.game.roomId = generateRoomId()
//     req.body.game.host = req.user.id
//     console.log(req.body.game)
// 	Game.create(req.body.game)
//         .then((game) => {
//             addPlayer(game.roomId, game.host)
//             return game
//         })
// 		// respond to succesful `create` with status 201 and JSON of new "game"
// 		.then((game) => {
            
//             console.log(game)
// 			res.status(201).json({ game: game.toObject() })
// 		})
// 		// if an error occurs, pass it off to our error handler
// 		// the error handler needs the error message and the `res` object so that it
// 		// can send an error message back to the client
// 		.catch(next)
// })


const createGame = () => {

}


module.exports = {createGame}