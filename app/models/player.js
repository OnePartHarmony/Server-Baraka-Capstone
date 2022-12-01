const mongoose = require('mongoose')

const commandSchema = require('./command')

const playerSchema = new mongoose.Schema(
	{
        user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
        gold: {
            type: Number,
            default: 0,
            required: true,
        },
        season: {
            type: String,
            required: true,
            enum: ['spring', 'summer', 'autumn', 'winter']
        },
        score: {
            type: Number,
            default: 0,
            required: true
        },
        formationName: String,
        commands: [commandSchema],
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Player', playerSchema)
