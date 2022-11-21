const mongoose = require('mongoose')

const unitSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			required: true,
            enum: ['solider', 'priest']
		},
        strength: Number,
		isFatigued: Boolean,
        commander: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Player',
			required: true,
		},
        upkeepCost: Number,
    },
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Unit', unitSchema)
