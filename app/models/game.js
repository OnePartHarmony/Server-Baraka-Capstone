const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema(
	{
		roomId: {
			type: String,
			required: true,
		},
		territories: [],
		players: [],
        currentPhase: {
            String,
            enum: ['advance', 'battle', 'excise', 'muster', 'sow']
        },
        currentSeason: {
            String,
            enum: ['spring', 'summer', 'autumn', 'winter']
        },
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Game', gameSchema)
