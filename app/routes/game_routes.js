// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for games
const Game = require('../models/game')
const User = require('../models/user')
const Territory = require('../models/territory')
const Unit = require('../models/unit')
const Player = require('../models/player')
// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

const { unitStats, orderOfSeasons } = require('../constants')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { game: { title: '', text: 'foo' } } -> { game: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

const initializeMap = require('../scripts/scripts')
const adjacents = require('../constants')
const {generateRoomId, addPlayer} = require('./game_functions')


///////////////////////////////////////
// Scripts for Routes
///////////////////////////////////////
// temp storage for various scripts
// re-factor later

// Script for initializing game
// const initializeGameBoard = (gameId) => {
//     const addTerritories = initializeMap(gameId)
//     Game.findById(gameId)
//         .then(game => {
//             game.orderSeasons()
//             game.currentSeason = game.allSeasons[0]
//             game.save()
            
//             if (game.territories.length < addTerritories.length) {
//                     addTerritories.forEach(territory => {
//                         Territory.create(territory)
//                             .then(territory => {
//                                 let terrId = territory._id
//                                 // we have to find the game each time to prevent parallel saves unfortunatly
//                                 // may revisit by building an array than adding the whole array at once...
//                                 Game.findById(gameId)
//                                     .then(game => {
//                                         game.territories.push(terrId)
//                                         return game.save()
//                                     })
//                             })
//                     })
            
//             }
//         return game  
//         })
//         // .then(game => {
//         //     game.setPlacementOrder()
//         //     game.save()
//         // })
// } 




// Script for adding a player to a game and randomly assigning a season
// const addPlayer = (roomId, userId) => {
//     let availableSeasons = orderOfSeasons.slice()
//     let randIndex
//     // First, we find the game
//     Game.findOne({ roomId: roomId })
//         .then(game => {
//             orderOfSeasons.forEach(season => {
//                 if (game.allSeasons.includes(season)) {
//                     let index = availableSeasons.indexOf(season)
//                     availableSeasons.splice(index, 1)        
//                 }
//             })
//             randIndex = Math.floor(Math.random() * availableSeasons.length)
//             return game
//         })
//         .then(game => {
//             // then we create the player...
//             Player.create({user: userId, season: availableSeasons[randIndex]})
//                 .then(player => {
//                         // and modify the game document to add the player to the game and the season to the list of seasons in game
//                         game.players.push(player._id)
//                         game.allSeasons.push(availableSeasons[randIndex])
//                         return game.save()
//                         })
                
//                 .then(game => {
//                     if (game.players.length === game.numberOfPlayers) {
//                         initializeGameBoard(game._id)
//                     }
//                 })
//             })
// }



// This script is for generating a random room code for socket.io and ensuring it isn't currently in use
// const generateRoomId = () => {
//     let randId = Math.floor(Math.random()*100000)
//     if (randId < 10000) {
//         randId += 10000
//     }
//     if (Game.find({ roomId: randId}).length > 0) {
//         generateRoomId
//     } else{
//         return randId
//     }
// }


const buildTerritories = async (gameId) => {
    const addTerritories = initializeMap(gameId)
    const territoryIds = []
    await addTerritories.forEach(territory => {
        Territory.create(territory)
            .then(territory => {
                territoryIds.push(territory._id)
            })
        })
    Game.findById(game.id)
        .then(game => {
            game.territories = territoryIds
            game.save()
        })
}

////////////////////////////////////////
// END Scripts for Routes
////////////////////////////////////////


// INDEX
// GET /games
router.get('/games', requireToken, (req, res, next) => {
	Game.find()
		.then((games) => {
			// `games` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return games.map((game) => game.toObject())
		})
		// respond with status 200 and JSON of the games
		.then((games) => res.status(200).json({ games: games }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// SHOW
// GET /games/5a7db6c74d55bc51bdf39793
router.get('/games/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Game.findById(req.params.id)
        .populate({
            path: 'players',
                populate : {
                    path: 'user', select : 'username'
                }
        })
        // we are no longer using documents for units so this is un needed
        // .populate({
        //     path : 'territories',
        //         populate : {
        //             path : 'units',
        //             populate : {
        //                 path : 'commander',
        //                     populate : {
        //                         path: 'user', select : 'username'
        //                     }
        //             },
        //         },
        // })
        .populate({
            path: 'territories',    
                populate : {
                    path : 'controlledBy',
                            populate : {
                                path: 'user', select : 'username'
                            }
                }
        })
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "game" JSON
		.then((game) => res.status(200).json({ game: game.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /games
router.post('/games', requireToken, (req, res, next) => {
    const roomId = generateRoomId()
	req.body.game.roomId = roomId
    // set owner of new game to be current user
    req.body.game.host = req.body.user._id
	Game.create(req.body.game)
        .then((game) => {            
            addPlayer(roomId, req.body.user._id )
            return game           
        })
        .then((game) => {
            buildTerritories(game._id)
            return game
        })
		// respond to succesful `create` with status 201 and JSON of new "game"
		.then((game) => {
            // add roomId to user document
            User.findById(req.body.user._id)
                .then(user => {                    
                    user.gameRoomId = roomId
                    return user.save()
                })
                .then(user => {
                    res.status(201).json({ game: game.toObject(), user: user.toObject() })
                })
		        .catch(next)
            // res.status(201).json({ game: game.toObject() })
		})
		.catch(next)
})


//Intialize Game Board
//PATCH /games/<id>/initialize
// router.patch('/games/:id/initialize', (req, res, next) => {
//     const gameId = req.params.id
//     // const game = Game.findById(gameId)
//     //     .then(game => console.log(game))
//     // // console.log('i am game', game)
//     // let numOfTerrInGame
//     const addTerritories = initializeMap(gameId)
//     Game.findById(gameId)
//         .then(game => {
//             console.log(game.territories.length)
//             return game.territories.length
//         })
//         .then(num => {
//             console.log(num)
//             if (num < addTerritories.length) {
//                     addTerritories.forEach(territory => {
//                         Territory.create(territory)
//                             .then(territory => {
//                                 let terrId = territory._id
//                                 Game.findById(gameId)
//                                     .then(game => {
//                                         game.territories.push(terrId)
//                                         return game.save()
//                                     })
//                             })
//                     })
//                 return res.sendStatus(201)
//             } else {
//                 return res.sendStatus(204)
//             }
//     })
// })

// POST
// Add Unit to map
// abandonned as we are no longer using documents for units
// router.post('/games/:id/:playerId/add_unit/:location', requireToken, (req, res, next) => {
//     const gameId = req.params.id
//     const location = req.params.location
//     req.body.unit.commander = req.params.playerId
//     const defaultStats = unitStats(req.body.unit.type)
//     req.body.unit.upkeepCost = defaultStats.upkeepCost
//     req.body.unit.strength = defaultStats.strength
//     Unit.create(req.body.unit)
//         .then((unit) => {
//             Territory.findOne({gameId: gameId, number: location})
//                 .then(territory => {
//                     territory.units.push(unit._id)
//                     territory.save()
//                 })
//         })
//         .then(unit => {
//             res.status(201).json({ unit: unit })
//         })
// })

// POST
// add Player to game
router.post('/games/:id/add_player/', requireToken, (req, res, next) => {
    const gameId = req.params.id
    req.body.player.user = req.user.id
    Player.create(req.body.player)
        .then((player) => {
            Game.findById(gameId)
                .then(game => {
                    game.players.push(player._id)
                    game.save()
                })
        })
        .then(player => {
            res.status(201).json({ player: player })
        })
})

// UPDATE
// PATCH /games/5a7db6c74d55bc51bdf39793
router.patch('/games/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.game.owner

	Game.findById(req.params.id)
		.then(handle404)
		.then((game) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, game)

			// pass the result of Mongoose's `.update` to the next `.then`
			return game.updateOne(req.body.game)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /games/5a7db6c74d55bc51bdf39793
router.delete('/games/:id', requireToken, (req, res, next) => {
	Game.findById(req.params.id)
		.then(handle404)
		.then((game) => {
			// throw an error if current user doesn't own `game`
			// requireOwnership(req, game)
			game.territories.forEach(territory => {
                Territory.findById(territory)
                    // we are no longer using documents for units so this is un needed
                    // .then(territory => {
                    //     territory.units.forEach(unit => {
                    //         Unit.findById(unit)
                    //             .then(unit => {
                    //                 unit.deleteOne()
                    //             })
                    //     })
                    //     return territory
                    // })
                    .then(territory => {
                        territory.deleteOne()
                    })
            })
            game.players.forEach(player => {
                Player.findById(player)
                    .then(player => {
                        player.deleteOne()
                    })
            })
            return game
		})
        .then(game => {
			game.deleteOne()
        })
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router
