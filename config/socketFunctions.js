const { checkGameExistence, checkIfPlayer, checkFullGame, addPlayer } = require('../app/routes/game_functions')
const {joinRoom} = require('../app/routes/user_functions')


let io
let socket

exports.socketFunctions = (thisIo, thisSocket) => {
    io = thisIo
    socket = thisSocket
    socket.emit('woohoo', { message: "You are connected!" })

    socket.on('joinGame', joinGame)
    socket.on('reJoinGame', reJoinGame)
}
  
//   async function createNewGame(user, playerCount, callback) {

//     //in order to add items to callback within different functions
//     let callbackObject = {}
//     const addToCallback = (object) => {
//         callbackObject = Object.assign(callbackObject, object)
//     }


//     //create unique and random room id
//     const roomId = await generateRoomId()
//     // host joins the game room 
//     this.join(roomId)
    
//     Promise.all([
//         //room id is added to user document
//         joinRoom(user, roomId, addToCallback),
//         //create game and player document linked to game
//         createGame(user, roomId, playerCount, addToCallback, this)
//     ])
//     .then(() => {
//         // callback returns the Room ID and user to the client
//         callback(callbackObject)
//     })

//     //send info to player
//     // this.emit('status', {message: 'you are --color/season--'})    
    
// }

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
        console.log(userIsPlayer)
        if (userIsPlayer) {
            //add room id to user doc
            await joinRoom(user, roomId, addToCallback)
            //re-join the game
            this.join(user.gameRoomId)
            addToCallback({message: 'you re-joined the room!'})
            callback(callbackObject)
        } else {
            //check if game is full
            const gameIsFull = await checkFullGame(gameId, addToCallback)
            if (gameIsFull) {
                callback({invalid: 'Game is full, no more players can join.'})
            } else {
                //add player to game
                await addPlayer(roomId, user._id)
                //add room id to user doc, join game room
                await joinRoom(user, roomId, addToCallback)
                this.join(user.gameRoomId)
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
        this.join(user.gameRoomId)
        callback({message: 'you re-joined the room!'})
    } else {
        //remove invalid room id from user document
        await joinRoom(user, null, addToCallback)
        addToCallback({invalid: 'tried to join invalid room'})
        callback(callbackObject)
    }    
}