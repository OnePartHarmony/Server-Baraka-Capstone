const User = require('../models/user')

//patch user model with socket room id
const joinRoom = (currentUser, roomId) => {
	User.findById(currentUser._id)
		.then(user => {
			user.gameRoomId = roomId
			return user.save()
		})
		.catch(err => console.log(err))
}

module.exports = { joinRoom }