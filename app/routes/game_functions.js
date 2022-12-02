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
// const adjacents = require('../constants')
// const game = require('../models/game')


// script for getting the current populated game data and returning it as an object
async function getPopulatedGame(roomId) {
    // console.log(roomId)

    // Game.findById(gameId)
    const popGame = await Game.findOne({ roomId: roomId })
        .populate({
            path: 'players',
                populate : {
                    path: 'user', select : 'username'
                }
        })
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
		.then((game) => {            
            // console.log(game)
            return game
        })
		.catch(() => console.error())
    return popGame
}


async function sendGameToRoom(roomId, io) {
    const popGame = await getPopulatedGame(roomId)
    io.to(roomId).emit('gameData', {game: popGame})
}


// Script for adding units to territories during initial game setup phase
const initialPlacement = async (playerId, territoryId) => {
    const territory = await Territory.findById(territoryId)
    const player = await Player.findById(playerId)
    const game = await Game.findById(player.gameId)
    if (game.placementOrder[0] === player.season && (!territory.controlledBy || territory.controlledBy === playerId)) {
        territory.controlledBy = playerId
        territory.priest += 1
        await territory.save()
        const newPlacementOrder = game.placementOrder.slice()
        newPlacementOrder.splice(0,1)
        game.placementOrder = newPlacementOrder
        await game.save()
        const gameToSend = await getPopulatedGame(game._id)
        return gameToSend
    } else {
        console.log('Illegal Move')
    }

}


// Script for initializing game
const initializeGameBoard = async (gameId, io) => {
    // const addTerritories = initializeMap(gameId)
    Game.findById(gameId)
        .then(game => {
            game.orderSeasons()
            game.currentSeason = game.allSeasons[0]
            // game.save()
            // addTerritories.forEach(territory => {
            //     Territory.create(territory)
            //         .then(territory => {
            //             let terrId = territory._id
            //             // we have to find the game each time to prevent parallel saves unfortunatly
            //             // may revisit by building an array than adding the whole array at once...
            //             Game.findById(gameId)
            //                 .then(game => {
            //                     game.territories.push(terrId)
            //                     return game.save()
            //                 })
            //         })
            // })
        return game.save()
        })
        .then(game => {
            sendGameToRoom(game.roomId, io)

        })
        // .then(game => {
        //     game.setPlacementOrder()
        //     game.save()
        // })
} 

// Script for adding a player to a game and randomly assigning a season
async function addPlayer(roomId, userId, io) {
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
                        return game.save()
                        })
                
                .then(game => {
                    if (game.players.length === game.numberOfPlayers) {
                        initializeGameBoard(game._id, io)
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

// // CREATE GAME
// async function createGame(user, roomId, playerCount, addToCallback, socket) {
//     let gameData = {
//         // players: [user._id],
//         roomId: roomId,
//         host: user._id,
//         numberOfPlayers: playerCount
//     }
//     await Game.create(gameData)
//         .then((game) => {
//             addPlayer(roomId, user._id, addToCallback, socket)
//             return game
//         })
//         // respond to succesful `create` with status 201 and JSON of new "game"
//         .then((game) => {
//             addToCallback({ game: game.toObject() })
//         })
//         // if an error occurs, send it in the callback
//         .catch(err => {addToCallback({error: err})})
// }






////check if game exists with roomId
async function checkGameExistence(roomId, addToCallback) {
    const gameId = await Game.findOne({ roomId: roomId })
        .then(game => {return game._id})
        .catch(err => {addToCallback({error: err})})
    return gameId
}

//check if user is a player in Game
async function checkIfPlayer(gameId, user, addToCallback) {
    const player = await Game.findById(gameId)
        .populate({
            path : 'players',
                populate : {
                    path : 'user'
                }
        })
        .then(game => {
            let foundPlayer = false
            game.players.forEach(player => {
            // I wanted to check this against ids, but they aren't referenced the same way
                if (player.user.username === user.username) {
                    foundPlayer = true
                }
            })
            return foundPlayer
        })
        .catch(err => {addToCallback({error: err})})
    return player
}

////check if game is full (or if new player can be added)
async function checkFullGame(gameId, addToCallback) {
    
    const full = await Game.findById(gameId)
        .then(game => {
            if (game.numberOfPlayers === game.players.length){
                return true
            } else {
                return false
            }
        })
        .catch(err => {addToCallback({error: err})})
    return full
}

const addInitialUnit = async (territoryId, playerId, gameId) => {
    const roomId = await Territory.findById(territoryId)
        .then(territory => {
            territory.controlledBy = playerId
            territory.priests++
            return territory.save()
        })
        .then(() => {
            return Game.findById(gameId)
                .then(game => {
                    const newPlacementOrder = game.placementOrder.slice()
                    newPlacementOrder.splice(0,1)
                    if (newPlacementOrder.length === 0) {
                        game.command = true
                    }
                    game.placementOrder = newPlacementOrder
                    return game.save()
                })
                .then(game => {
                    // console.log(game.roomId)
                    return game.roomId
                })
        })
        console.log(roomId)
    return roomId
}

const setCommandsInGame = async (gameId) => {
    // get some infor from the game document
    const game = await Game.findById(gameId)
    const availableSeasons = game.allSeasons.slice()
    console.log(availableSeasons)
    const resOrder = [game.currentSeason]
   
    let advanceCommands = []
    let advanceCommandsSorted = []
    let otherCommands = []
    let advanceRounds = 0
    // put the seasons in the correct order based on the current season
    // (game.allSeasons is already sorted in the correct order at game initialization)
    let index = availableSeasons.indexOf(game.currentSeason)
    console.log('first index for res order: ', index)
    for (let i = 1; i < availableSeasons.length; i++) {
        index += 1
        if (index === availableSeasons.length) {
            index = 0
        }
        resOrder.push(availableSeasons[index])
    }
    console.log('res order: ', resOrder)
    // const finalSeason = resOrder[resOrder.length - 1]
    // get all the players commands from the game in the player order
    const playersCommands = []
    for (let i = 0; i < availableSeasons.length; i++) {
        const player = await Player.findOne({ id: game.players, season: resOrder[i] })
        playersCommands.push(player.commands)
    }
    console.log('player commands array of arrays', playersCommands)
    playersCommands.forEach(list => {
        let currentAdvanceRounds = 0
        list.forEach(command => {
            if (command.type === 'advance') {
                currentAdvanceRounds ++
                advanceCommands.push(command)
            } else {
                otherCommands.push(command._id)
            }
        })
        if (currentAdvanceRounds > advanceRounds) {
            advanceRounds = currentAdvanceRounds
        }
    })
    for (let i = 1; i <= advanceRounds; i++) {
        for (let j = 0; j < resOrder.length; j++) {
            advanceCommands.forEach(command => {
                if (command.season === resOrder[j] && command.advanceOrder === i) {
                    return advanceCommandsSorted.push(command._id)
                }
            })
        }
    }
    game.pendingCommands = advanceCommandsSorted.concat(otherCommands)
    console.log('pending commands:', game.pendingCommands)
    return game.save()
}

const setPlayerCommands = async (commandObject, playerId) => {
    const formationName = commandObject.formation
    // console.log('formation: ', formationName)
    const commands = commandObject.commandList
    // console.log('commands: ',commands)
    let numberOfPlayersWithCommands = 0
    const player = await Player.findById(playerId)
    // commands.forEach(command => {
    //     // console.log('avast, the command: ', command)
    //     player.commands.push(command)
    // })
    player.commands = commands
    console.log('CCCCCCCC', player.commands, commands)
    player.formationName = formationName
    const savedPlayer = await player.save()
    const game = await Game.findOne({players: savedPlayer._id}) 
        .populate('players')
        
        .then(game => {
            // console.log('can I see the game?', game) 
            game.players.forEach(player =>{
                if (player.commands.length > 0) {
                    numberOfPlayersWithCommands ++
                }
            })
            return game
        })
        
    if (numberOfPlayersWithCommands === game.numberOfPlayers) {
        return true
    } else {
        return false
    }
}

const gameCleanup = async (gameId) => {
    // const game = await 
    const game = await Game.findById(gameId)
    players = game.players
        // .then(game => {
            players.forEach(playerId => {
                Player.findById(playerId)
                    .then(player => {
                        return player.resetCommands()
                        // player.formationName = null
                        // player.commands = []
                        // return player.save()
                    })
            })
        //     return game
        // })
        // .then(game => {    
        //     game.pendingCommands = []
        //     game.nextSeason()
        //     console.log('squeky, squeky. All Clean')
        //     return game.save()
        // })
    game.pendingCommands = []
    game.nextSeason()
    console.log('squeky, squeky. All Clean')
    return game.save()

}

const resolveRound = async (gameId) => {
    const game = await Game.findById(gameId)
    game.pendingCommands.forEach(commandId => {
        Player.findOne({'commands._id' : commandId})
            .then(player => {
                // console.log('Im a player:', player)
                return subDoc = player.commands.id(commandId)
                // console.log('Im a subdoc:', subDoc)
            })
            .then(subDoc => {    
                subDoc.executeCommand()
            })        
    })
        
    const cleanedGame = await gameCleanup(game._id)
    return cleanedGame
    // return resolvedGameId
}

module.exports = { generateRoomId, addPlayer, checkGameExistence, checkIfPlayer, checkFullGame, initialPlacement, getPopulatedGame, sendGameToRoom, addInitialUnit, setCommandsInGame, setPlayerCommands, resolveRound, gameCleanup }

