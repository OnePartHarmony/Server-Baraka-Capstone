// const User = require('../app/models/user')
const Game = require('../app/models/game')
const { createGame } = require('../app/routes/game_function_routes')
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
       
    let roomId
    //create random room id and check if any user is currently using that room id
    const createUniqueId = () => {
        roomId = (Math.floor( Math.random() * 100000 )).toString()        
        Game.find({'roomId': roomId})
            .then(result => {
                if (!result.length) {
                    console.log(roomId)
                    return roomId
                } else {
                    return createUniqueId()
                }
            })
            .catch(err => console.log(err))
    }
    await Promise.all([createUniqueId()])
                .then(() => {
                    // host joins the game room 
                    this.join(roomId)
                    //room id is added to user document
                    Promise.all([
                        joinRoom(user, roomId, addToCallback)
                        //NEED TO create game and player document linked to game
                            // createGame(user, roomId, playerCount, callback)
                    ])
                    .then(() => {
                        // callback returns the Room ID and user to the client
                        callback(callbackObject)
                    })
                })

    


   

    //send info to player
    // this.emit('status', {message: 'you are --color/season--'})    
    
}



  //When join game is clicked and 'joinGame' event is sent from client with room id
function joinGame(roomId, user, callback) {
    
    //NEED TO check if room id is valid

    this.join(roomId)
    
    
    io.to(roomId).emit('status', {message: `${user.username} has joined the game`})

    //NEED TO check if user is player, if not and more players can join, create player document linked to game
    //send info to player
    this.emit('status', {message: 'you are --color/season--'})


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
    this.emit('status', {message: 'welcome back'})

    callback({message: 'you reJoined the room!'})
}