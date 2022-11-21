const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema(
	{
		roomId: {
			type: String,
			required: true,
		},
		territories: [{ type: ObjectId, ref: 'Territories' }],
		players: [{ type: ObjectId, ref: 'User' }],
        currentPhase: {
            type: String,
            enum: ['advance', 'battle', 'excise', 'muster', 'sow'],
        },
        currentSeason: {
            type: String,
            enum: ['spring', 'summer', 'autumn', 'winter'],
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
