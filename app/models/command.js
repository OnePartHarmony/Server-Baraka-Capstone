const mongoose = require('mongoose')
const dice = require('../scripts')

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
		priests: Number,
	},
	{
		timestamps: true,
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)


// potential combat detection, run in 'advance' command function
commandSchema.methods.detectCombat = function detectCombat() {
	if (!this.newTerritory.controlledBy ||
		this.newTerritory.controlledBy === this.originTerritory.controlledBy ||
		(!this.newTerritory.units.map(unit => { return unit.type }).includes('soldier') &&
		!this.newTerritory.units.map(unit => { return unit.type }).includes('priest'))) {

		// move in units
		this.newTerritory.controlledBy = this.originTerritory.controlledBy
	}
	else {
		// run combat function?
		// set combat flag to true?
	}
}

// potential combat function
commandSchema.methods.combat = function combat(newTerrFormation, originTerrFormation) {

	// grab initial attack strength
	let attackStrength = this.priests + (this.soldiers * 2)

	// bonus for leadership
	if (this.priests) {
		attackStrength += this.soldiers
	}

	// initial defense strength
	let defenseStrength = this.newTerritory.units.map(unit => {return unit.strength}).reduce((total, unitStrength) => total + unitStrength, 0)

	// bonus for leadership
	if (this.newTerritory.units.map(unit => { return unit.type }).includes('priest')) {
		this.newTerritory.units.forEach(unit => {
			if (unit.type === 'soldier') {
				attackStrength += 1
			}
		})
	}

	// mountain terrain buff
	if (this.originTerritory.type === 'mountain' && this.newTerritory.type !== 'mountain') {
		attackStrength += 3
	} else if (this.newTerritory.type === 'mountain' && this.originTerritory.type !== 'mountain') {
		defenseStrength += 3
	}

	// formation bonus, most significant by far so perhaps should come before some other bonuses
	if (dice.roll(originTerrFormation) > dice.roll(newTerrFormation)) {
		attackStrength *= 2
	} else {
		defenseStrength *= 2
	}

	// result
	if (attackStrength > defenseStrength) {
		// destroy all defenders
		// move in units
		this.newTerritory.controlledBy = this.originTerritory.controlledBy
	} else {
		// destroy all attackers
	}
}

module.exports = commandSchema
