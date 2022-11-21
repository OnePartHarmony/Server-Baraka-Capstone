const mongoose = require('mongoose')

const territorySchema = new mongoose.Schema(
	{
        number: Number,
		type: {
			type: String,
			required: true,
            enum: ['empty', 'field', 'farmland', 'water', 'mountain']
		},
		units: [{ type: ObjectId, ref: 'Unit' }],
        wealth: Number,
		abundance: Number,
        adjacents: [],
        controlledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Player',
			required: true,
		},
        population: Number,
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Territory', territorySchema)
