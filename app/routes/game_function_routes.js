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
const game = require('../models/game')



// Script for initializing game
const initializeGameBoard = (gameId) => {
    const addTerritories = initializeMap(gameId)
    Game.findById(gameId)
        .then(game => {
            game.orderSeasons()
            game.currentSeason = game.allSeasons[0]
            game.save()
            
            if (game.territories.length < addTerritories.length) {
                    addTerritories.forEach(territory => {
                        Territory.create(territory)
                            .then(territory => {
                                let terrId = territory._id
                                // we have to find the game each time to prevent parallel saves unfortunatly
                                // may revisit by building an array than adding the whole array at once...
                                Game.findById(gameId)
                                    .then(game => {
                                        game.territories.push(terrId)
                                        return game.save()
                                    })
                            })
                    })
            
            }
        return game  
        })
        // .then(game => {
        //     game.setPlacementOrder()
        //     game.save()
        // })
} 

// Script for adding a player to a game and randomly assigning a season
async function addPlayer(roomId, userId, addToCallback, socket) {
    let availableSeasons = orderOfSeasons.slice()
    let randIndex
    // First, we find the game
    await Game.findOne({ roomId: roomId })
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
                        socket.emit('status', {message: `Your season is ${availableSeasons[randIndex]}`})
                        return game.save()
                        })
                
                .then(game => {
                    if (game.players.length === game.numberOfPlayers) {
                        initializeGameBoard(game._id)
                    } else {
                        console.log("here", game.toObject())
                        // addToCallback({ game: game.toObject() })
                    }
                })
            })
}

// This script is for generating a random room code for socket.io and ensuring it isn't currently in use
const generateRoomId = () => {
    let randId = Math.floor(Math.random()*100000)
    if (randId < 10000) {
        randId += 10000
    }
    if (Game.find({ roomId: randId}).length > 0) {
        generateRoomId
    } else{
        return randId
    }
}

// CREATE GAME
async function createGame(user, roomId, playerCount, addToCallback, socket) {
    let gameData = {
        // players: [user._id],
        roomId: roomId,
        host: user._id,
        numberOfPlayers: playerCount
    }
    await Game.create(gameData)
        .then((game) => {
            addPlayer(roomId, user._id, addToCallback, socket)
            return game
        })
        // respond to succesful `create` with status 201 and JSON of new "game"
        .then((game) => {
            addToCallback({ game: game.toObject() })
        })
        // if an error occurs, send it in the callback
        .catch(err => {addToCallback({error: err})})
}


module.exports = {createGame, generateRoomId}