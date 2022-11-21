const mongoose = require('mongoose')

const commandSchema = require('./command')

const playerSchema = new mongoose.Schema(
	{
        user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
        gold: Number,
        season: {
            type: String,
            required: true,
            enum: ['spring', 'summer', 'autumn', 'winter']
        },
        score: Number,
        commands: [commandsSchema],
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Player', playerSchema)
