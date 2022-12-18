const mongoose = require('mongoose')

const territorySchema = new mongoose.Schema(
	{
        number: Number,
		type: {
			type: String,
			required: true,
            enum: ['empty', 'field', 'farmland', 'water', 'mountain']
		},
		// units: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
		priests: {
			type: Number,
			required: true,
			default: 0
		},
		soldiers: {
			type: Number,
			required: true,
			default: 0
		},
        wealth: Number,
		abundance: Number,
        adjacents: [Number],
        controlledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Player',
		},
        population: Number,
        gameId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'game'
        }
    },
	{
		timestamps: true,
	}
)

module.exports = territorySchema
