const User = require('../models/user')

//patch user model with socket room id, return new user and roomId to client
async function joinRoom (currentUser, roomId, addToCallback) {
	await User.findById(currentUser._id)
		.then(user => {
			user.gameRoomId = roomId
			return user.save()
		})
		.then(user => {
			addToCallback( {roomId: roomId, user: user.toObject() } )
		})
		.catch(err => {addToCallback({error: err})})
}

module.exports = { joinRoom }