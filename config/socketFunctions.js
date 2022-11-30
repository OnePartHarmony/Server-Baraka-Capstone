const { checkGameExistence, checkIfPlayer, checkFullGame, addPlayer, sendGameToRoom, addInitialUnit } = require('../app/routes/game_functions')
const {joinRoom} = require('../app/routes/user_functions')


let io
let socket

exports.socketFunctions = (thisIo, thisSocket) => {
    io = thisIo
    socket = thisSocket
    socket.emit('woohoo', { message: "You are connected!" })

    socket.on('joinGame', joinGame)
    socket.on('reJoinGame', reJoinGame)
    socket.on('initialUnitPlacement', placeInitialUnit)
}

//leave any rooms socket was in so new room is only one, then join this room
async function leaveAndJoin(socket, roomId) {
    for (let i = 1; i < socket.rooms.length; i++){
        socket.leave(socket.rooms[i])        
    }
    socket.join(roomId)
}


//When join game is clicked and 'joinGame' event is sent from client with room id
async function joinGame(roomId, user, callback) {
    console.log("joinGame")
    //in order to add items to callback within different functions
    let callbackObject = {}
    const addToCallback = (object) => {
        callbackObject = Object.assign(callbackObject, object)
    }

    //check if room id is valid
    const gameId = await checkGameExistence(roomId, addToCallback)
    if (gameId) {
        //check if user is already a player in this game
        const userIsPlayer = await checkIfPlayer(gameId, user, addToCallback)
        console.log("userIsPlayer", userIsPlayer)
        if (userIsPlayer) {
            Promise.all([
                //re-join the socket room
                leaveAndJoin(this, user.gameRoomId),
                //add room id to user doc
                joinRoom(user, roomId, addToCallback)
            ])
            .then(() => {
                addToCallback({message: 'you re-joined the room!'})
                callback(callbackObject)
            })         

        } else {
            //check if game is full
            const gameIsFull = await checkFullGame(gameId, addToCallback)
            if (gameIsFull) {                
                callback({invalid: 'Game is full, no more players can join.'})
            } else {                
                await Promise.all([
                    //add socket to room
                    leaveAndJoin(this, user.gameRoomId),
                    //add room id to user doc 
                    joinRoom(user, roomId, addToCallback)
                ])
                .then(
                    //add player to game
                    addPlayer(roomId, user._id, io)
                )                              
                addToCallback({message: 'you joined the game!'})
                callback(callbackObject)
                io.to(roomId).emit('status', {message: `${user.username} has joined the game`})
            }            
        }
    } else {
        callback({invalid: 'Not a valid room key - try again or make a new game.'})
    }

}


async function reJoinGame(user, callback) {    
    console.log("reJoinGame")
    //in order to add items to callback within different functions
    let callbackObject = {}
    const addToCallback = (object) => {
        callbackObject = Object.assign(callbackObject, object)
    }

    //check if room id is valid for existing game and user is player
    const gameId = await checkGameExistence(user.gameRoomId, addToCallback)
    const userIsPlayer = await checkIfPlayer(gameId, user, addToCallback)
    if (gameId && userIsPlayer) {
        //check if game is full        
        const gameIsFull = await checkFullGame(gameId, addToCallback)
        if (gameIsFull) {            
            sendGameToRoom(user.gameRoomId, io)
        }
        Promise.all([leaveAndJoin(this, user.gameRoomId)])
        // .then(console.log("rooms", this.rooms))
        .then(callback({message: 'you re-joined the room!'}))
        
    } else {
        //remove invalid room id from user document
        await joinRoom(user, null, addToCallback)
        addToCallback({invalid: 'tried to join invalid room'})
        callback(callbackObject)
    }    
}

async function placeInitialUnit(territoryId, playerId, gameId) {
    const roomId = await addInitialUnit(territoryId, playerId, gameId)
    // console.log(roomId)
    sendGameToRoom(roomId, io) 
}

exports.io = io