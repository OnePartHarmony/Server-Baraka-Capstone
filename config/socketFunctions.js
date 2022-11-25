let io
let socket

exports.socketFunctions = (thisIo, thisSocket) => {
    io = thisIo
    socket = thisSocket
    socket.emit('woohoo', { message: "You are connected!" })

    socket.on('createNewGame', createNewGame)

}

//When new game is clicked and 'createNewGame' event is sent from client
function createNewGame(callback) {
    // Create a unique Socket.IO Room
    const roomId = Math.floor( Math.random() * 100000 )

    // host joins the game room (room id must be string)
    this.join(roomId.toString())

    // return the Room ID and the socket ID (not currently used) to the client
    callback({ roomId: roomId, mySocketId: this.id })
}
