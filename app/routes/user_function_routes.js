const User = require('../models/user')

//patch user model with socket room id
async function joinRoom(currentUser, roomId) {
	let userObject
	await User.findById(currentUser._id)
		.then(user => {
			user.gameRoomId = roomId
			return user.save()
		})
		.then(user => {
			userObject = user.toObject()			
		})
		.catch(err => console.log(err))
	return userObject
}

module.exports = { joinRoom }