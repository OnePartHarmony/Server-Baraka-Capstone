// This model is no longer in use, but will remain for future versions


const mongoose = require('mongoose')

const unitSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			required: true,
            enum: ['soldier', 'priest']
		},
        strength: Number,
		isFatigued: {
            type: Boolean,
            required: true,
            default: false
        },
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
