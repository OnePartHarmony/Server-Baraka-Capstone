const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema(
	{
		roomId: {
			type: String,
			required: true,
		},
        numberOfPlayers: {
            type: Number,
            required: true,
            // include 1 in this enum for quick testing of auto-initialize
            enum: [2, 3, 4]
        },
		territories: [{ type: ObjectId, ref: 'Territory' }],
		players: [{ type: ObjectId, ref: 'User' }],
        currentPhase: {
            type: String,
            enum: ['advance', 'battle', 'excise', 'muster', 'sow'],
        },
        currentSeason: {
            type: String,
            enum: ['spring', 'summer', 'autumn', 'winter'],
        },
        allSeasons: {
            type: Array,
            default: [],
            required: true
        },
        host: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: false,
		},
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Game', gameSchema)
