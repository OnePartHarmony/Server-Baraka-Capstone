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
			ref: 'Territory',
			required: true,
		},
		newTerritory: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Territory',
			required: true,
		},
		soldiers: Number,
		priest: Number,
	},
	{
		timestamps: true,
	}
)

// run in 'advance' command
commandSchema.methods.detectCombat = function detectCombat() {
	if (!newTerritory.controlledBy ||
		newTerritory.controlledBy === originTerritory.controlledBy ||
		(!newTerritory.units.map(unit => { return unit.type }).includes('soldier') &&
		!newTerritory.units.map(unit => { return unit.type }).includes('priest'))) {

		// move in units
		newTerritory.controlledBy = originTerritory.controlledBy
	}
	else {
		// begin combat
	}
}

module.exports = commandSchema
