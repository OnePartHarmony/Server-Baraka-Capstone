let io
let socket

exports.socketFunctions = (thisIo, thisSocket) => {
    io = thisIo
    socket = thisSocket
    socket.emit('woohoo', { message: "You are connected!" })

    socket.on('createNewGame', createNewGame)
    socket.on('joinGame', joinGame)
}

//When new game is clicked and 'createNewGame' event is sent from client
function createNewGame(playerCount, callback) {
    // Create a unique Socket.IO Room
    const roomId = Math.floor( Math.random() * 100000 )

    //NEED TO check if game id matches game
    //NEED TO create game and player document linked to game
    //send info to player
    this.emit('status', {message: 'you are --color/season--'})

    // host joins the game room (room id must be string)
    this.join(roomId.toString())    

    // return the Room ID to the client
    callback({ roomId: roomId })
}

//When join game is clicked and 'joinGame' event is sent from client with room id
function joinGame(roomId, user, callback) {

    //NEED TO check if room id is valid

    this.join(roomId)
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