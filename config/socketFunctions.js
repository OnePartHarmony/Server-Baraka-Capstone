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
function createNewGame(user, playerCount, callback) {
    // Create a unique Socket.IO Room (room id must be string)
    const roomId = (Math.floor( Math.random() * 100000 )).toString()

    //NEED TO check if game id matches game
    //NEED TO create game and player document linked to game
    //send info to player
    this.emit('status', {message: 'you are --color/season--'})

    // host joins the game room 
    this.join(roomId)
    //room id is added to user document
    joinRoom(user, roomId)


    // return the Room ID to the client
    callback({ roomId: roomId })
}

  //When join game is clicked and 'joinGame' event is sent from client with room id
function joinGame(roomId, user, callback) {
    
    //NEED TO check if room id is valid

    this.join(roomId)
    //room id is added to user document
    joinRoom(user, roomId)

    io.to(roomId).emit('status', {message: `a new player has joined the game`})

    //NEED TO create player document linked to game
    //send info to player
    this.emit('status', {message: 'you are --color/season--'})


    //NEED TO check if all players are in game
    //if all players are in, start game
    // const gameData = </find game/>
    // io.to(roomId).emit('startNewGame', gameData)



    callback({message: 'you joined the room!'})
}

function reJoinGame(roomId, user, callback) {
    
    //NEED TO check if room id is valid

    this.join(roomId)

    //NEED TO find player document linked to game
    //send info to player
    this.emit('status', {message: 'welcome back'})

    callback({message: 'you reJoined the room!'})
}