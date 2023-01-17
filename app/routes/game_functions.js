// pull in Mongoose model for games
const Game = require('../models/game')
const Player = require('../models/player')
// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const { ObjectId } = require('mongodb')

const customErrors = require('../../lib/custom_errors')

const { unitStats, orderOfSeasons } = require('../constants')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404




// script for getting the current populated game data and returning it as an object
async function getPopulatedGame(roomId) {
    // console.log(roomId)

    // Game.findById(gameId)
    const popGame = await Game.findOne({ roomId: roomId })
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
const initialPlacement = async (roomId, playerSeason, territoryNumber) => {
    const game = await Game.findOne({ roomId: roomId })
    const territory = game.territories.find(territory => territory.number === territoryNumber)
    const player = game.players.find(player => player.season === playerSeason)
    
    if (game.placementOrder[0] === player.season && (!territory.controlledBy || territory.controlledBy === player.season)) {
        territory.controlledBy = player.season
        territory.priest += 1
        const newPlacementOrder = game.placementOrder.slice()
        newPlacementOrder.splice(0,1)
        game.placementOrder = newPlacementOrder
        await game.save()
        // const gameToSend = await getPopulatedGame(game._id)
        // return gameToSend
        return game
    } else {
        console.log('Illegal Move')
    }

}


// Script for initializing game
const initializeGameBoard = async (gameId, io) => {
    Game.findById(gameId)
        .then(game => {
            game.orderSeasons()
            game.currentSeason = game.allSeasons[0]
        return game.save()
        })
        .then(game => {
            sendGameToRoom(game.roomId, io)

        })
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
            game.players.push({user: userId, season: availableSeasons[randIndex]})
            game.allSeasons.push(availableSeasons[randIndex])
            return game.save()
            })
        .then(game => {
            if (game.players.length === game.numberOfPlayers) {
                    initializeGameBoard(game._id, io)
                }
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

////check if game exists with roomId
async function checkGameExistence(roomId, addToCallback) {
    const gameId = await Game.findOne({ roomId: roomId })
        .then(game => {return game._id})
        .catch(err => {addToCallback({error: err})})
    return gameId
}

//check if user is a player in Game
async function checkIfPlayer(gameId, user, addToCallback) {
    const game = await Game.findById(gameId)    
    //     .populate({
    //         path : 'players',
    //             populate : {
    //                 path : 'user'
    //             }
    //     })
        .then(game => {
            let foundPlayer = false
            game.players.forEach(player => {
            // I wanted to check this against ids, but they aren't referenced the same way
                console.log('This is the user Id as seen by the game: ', player.user)
                console.log('This is the user Id as seen by the user: ', user.ObjectId())
                console.log("are they the same? ", player.user === user.ObjectId())
                if (player.user === user.ObjectId()) {
                    foundPlayer = true
                }
            })
            return foundPlayer
        })
        .catch(err => {addToCallback({error: err})})
    return game
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

const addInitialUnit = async (territoryNumber, playerSeason, gameId) => {
    const roomId = await Game.findById(gameId)
        .then(game => {
            let territory = game.territories.find(territory => territory.number === territoryNumber)
            territory.controlledBy = playerSeason
            territory.priests++
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
    console.log('advance commands: ', advanceCommands)
    for (let i = 1; i <= advanceRounds; i++) {
        for (let j = 0; j < resOrder.length; j++) {
            advanceCommands.forEach(command => {
                if (command.commanderSeason === resOrder[j] && command.advanceOrder === i) {
                    console.log('found an advance')
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
    console.log(commandObject)
    const formationName = commandObject.formation
    // console.log('formation: ', formationName)
    const commands = commandObject.commandList
    console.log('commands: ',commands)
    let numberOfPlayersWithCommands = 0
    const player = await Player.findById(playerId)
    // commands.forEach(command => {
    //     // console.log('avast, the command: ', command)
    //     player.commands.push(command)
    // })
    player.commands = commands
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
    // players = game.players
        // .then(game => {
            // players.forEach(playerId => {
                // Player.findById(playerId)
                //     .then(player => {
        game.players.forEach(player => {
                    return player.resetCommands()
                        // player.formationName = null
                        // player.commands = []
                        // return player.save()
                    // })
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

const resolveRound = async (gameId, io) => {
    const game = await Game.findById(gameId)
    // game.pendingCommands.forEach(commandId => {
    //     Player.findOne({'commands._id' : commandId})
    //         .then(player => {
    //             // console.log('Im a player:', player)
    //             return subDoc = player.commands.id(commandId)
    //             // console.log('Im a subdoc:', subDoc)
    //         })
    //         .then(subDoc => {    
    //             const executed = subDoc.executeCommand()
    //         })   
    // })
    const executeOneByOne = async (array, i) => {
        console.log("i", i)
        if (i < array.length) {
            const executed = await Player.findOne({'commands._id' : array[i]})
                .then(player => {
                    // console.log('Im a player:', player)
                    return subDoc = player.commands.id(array[i])
                    // console.log('Im a subdoc:', subDoc)
                })
                .then(subDoc => {    
                    return subDoc.executeCommand()
                })
            console.log("what did we get?", executed)
            if (executed) {
                executeOneByOne(array, i + 1)
            } else {
                return false
            }
        }
        return true 
    }
    const finishedAll = await executeOneByOne(game.pendingCommands, 0)
    console.log("finishedAll", finishedAll)
    if (finishedAll === false) {        
        io.to(game.roomId).emit('status', {message: 'failed to execute all commands'})
    } else if (finishedAll === true) {
        const cleanedGame = await gameCleanup(game._id)
        sendGameToRoom(cleanedGame.roomId, io)        
    }
        
    // const cleanedGame = await gameCleanup(game._id)
    // return cleanedGame
}

module.exports = { generateRoomId, addPlayer, checkGameExistence, checkIfPlayer, checkFullGame, initialPlacement, getPopulatedGame, sendGameToRoom, addInitialUnit, setCommandsInGame, setPlayerCommands, resolveRound, gameCleanup }

