const mongoose = require('mongoose')

const commandSchema = new mongoose.Schema(
	{
        type: {
            type: String,
            enum: ['advance', 'excise', 'muster', 'sow'],
            required: true
        },
        originTerritory: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Teritory',
			required: true,
		},
        newTerritory: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Teritory',
			required: true,
		},
        soldiers: Number,
        priest: Number,
    },
	{
		timestamps: true,
	}
)

module.exports = commandSchema
