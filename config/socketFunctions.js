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

    // host joins the game room (room id must be string)
    this.join(roomId.toString())

    // return the Room ID and the socket ID (not currently used) to the client
    callback({ roomId: roomId, mySocketId: this.id })
}

//When join game is clicked and 'joinGame' event is sent from client with room id
function joinGame(roomId, callback) {
    this.join(roomId)
    io.to(roomId).emit('status', {message: `a new player has joined the game`})
    callback({message: 'you joined the room!'})    
}