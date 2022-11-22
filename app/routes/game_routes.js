// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for games
const Game = require('../models/game')
const Territory = require('../models/territory')
const Unit = require('../models/unit')
const Player = require('../models/player')
// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

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
const unit = require('../models/unit')
const player = require('../models/player')

const generateRoomId = () => {
    const randId = Math.floor(Math.random()*100000)
    if (randId < 10000) {
        randId += 10000
    }
    if (Game.find({ roomId: randId}).length > 0) {
        generateRoomId
    } else{
        return randId
    }
}


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
        .populate('players')
        .populate({
            path : 'territories',
                populate : {
                    path : 'units',
                    populate : {
                        path : 'commander',
                            populate : {
                                path: 'user', select : 'username'
                            }
                    }
                },

                // populate : {
                //     path : 'controlledBy'
                // }
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
	// set owner of new game to be current user
    // req.body.game.players = [req.user.id]
	req.body.game.roomId = generateRoomId()
    req.body.game.host = req.user.id
    console.log(req.body.game)
	Game.create(req.body.game)
        .then((game) => {
            
            return game
        })
		// respond to succesful `create` with status 201 and JSON of new "game"
		.then((game) => {
            
            console.log(game)
			res.status(201).json({ game: game.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})


//Intialize Game Board
//PATCH /games/<id>/initialize
router.patch('/games/:id/initialize', (req, res, next) => {
    const gameId = req.params.id
    // const game = Game.findById(gameId)
    //     .then(game => console.log(game))
    // // console.log('i am game', game)
    // let numOfTerrInGame
    const addTerritories = initializeMap(gameId)
    Game.findById(gameId)
        .then(game => {
            console.log(game.territories.length)
            return game.territories.length
        })
        .then(num => {
            console.log(num)
            if (num < addTerritories.length) {
                    addTerritories.forEach(territory => {
                        Territory.create(territory)
                            .then(territory => {
                                let terrId = territory._id
                                Game.findById(gameId)
                                    .then(game => {
                                        game.territories.push(terrId)
                                        return game.save()
                                    })
                            })
                    })
                return res.sendStatus(201)
            } else {
                return res.sendStatus(204)
            }
    })
})

// POST
// Add Unit to map
router.post('/games/:id/:playerId/add_unit/:location', requireToken, (req, res, next) => {
    const gameId = req.params.id
    const location = req.params.location
    req.body.unit.commander = req.params.playerId
    Unit.create(req.body.unit)
        .then((unit) => {
            Territory.findOne({gameId: gameId, number: location})
                .then(territory => {
                    territory.units.push(unit._id)
                    territory.save()
                })
        })
        .then(unit => {
            res.status(201).json({ unit: unit })
        })
})

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
			requireOwnership(req, game)
			// delete the game ONLY IF the above didn't throw
			game.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router
