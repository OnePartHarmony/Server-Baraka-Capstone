// const User = require('../app/models/user')
const Game = require('../app/models/game')
const { createGame, generateRoomId } = require('../app/routes/game_function_routes')
const {joinRoom} = require('../app/routes/user_function_routes')


let io
let socket

exports.socketFunctions = (thisIo, thisSocket) => {
    io = thisIo
    socket = thisSocket
    socket.emit('woohoo', { message: "You are connected!" })

    socket.on('createNewGame', createNewGame)
    socket.on('joinGame', joinGame)
    socket.on('reJoinGame', reJoinGame)
}

  //When new game is clicked and 'createNewGame' event is sent from client

async function createNewGame(user, playerCount, callback) {

    //in order to add items to callback within different functions
    let callbackObject = {}
    const addToCallback = (object) => {
        callbackObject = Object.assign(callbackObject, object)
    }

    //create unique and random room id
    const roomId = await generateRoomId()    
    // host joins the game room 
    this.join(roomId)    
    
    Promise.all([
        //room id is added to user document
        joinRoom(user, roomId, addToCallback),
        //create game and player document linked to game
        createGame(user, roomId, playerCount, addToCallback, this)
    ])
    .then(() => {
        // callback returns the Room ID and user to the client
        callback(callbackObject)
    })

    //send info to player
    // this.emit('status', {message: 'you are --color/season--'})    
    
}

  //When join game is clicked and 'joinGame' event is sent from client with room id
function joinGame(roomId, user, callback) {
    
    //NEED TO check if room id is valid

        
    io.to(roomId).emit('status', {message: `${user.username} has joined the game`})

    //NEED TO check if user is player, if not and more players can join, create player document linked to game
    //send info to player
    this.emit('status', {message: 'you are --color/season--'})
    this.join(roomId)

    //NEED TO check if all players are in game
    //if all players are in and game hasn't started, start game
    // const gameData = </find game/>
    // io.to(roomId).emit('startNewGame', gameData)

    //room id is added to user document
    joinRoom(user, roomId, callback)
}



function reJoinGame(roomId, callback) {
    
    //NEED TO check if room id is valid

    this.join(roomId)

    //NEED TO find player document linked to game
    //send info to player
    // this.emit('status', {message: 'welcome back'})

    callback({message: 'you re-joined the room!'})
}