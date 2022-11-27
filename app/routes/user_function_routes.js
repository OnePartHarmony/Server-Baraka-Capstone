const User = require('../models/user')

//patch user model with socket room id, return new user and roomId to client
const joinRoom = (currentUser, roomId, callback) => {
	User.findById(currentUser._id)
		.then(user => {
			user.gameRoomId = roomId
			return user.save()
		})
		.then(user => {
			callback({ roomId: roomId, user: user.toObject() })
		})
		.catch(err => console.log(err))
}

module.exports = { joinRoom }