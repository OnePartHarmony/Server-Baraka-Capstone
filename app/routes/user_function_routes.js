const User = require('../models/user')

const joinRoom = (currentUser, roomId) => {
	// `req.user` will be determined by decoding the token payload
	User.findById(currentUser._id)
		// save user outside the promise chain
		.then(user => {
			user.gameRoomId = roomId
			return user.save()
		})
		// pass any errors along to the error handler
		.catch(err => console.log(err))
}

module.exports = { joinRoom }