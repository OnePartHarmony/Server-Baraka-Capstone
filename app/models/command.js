const mongoose = require('mongoose')
const dice = require('../scripts/scripts')
const Unit = require('./unit')

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
			required: true
		},
		newTerritory: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Territory',
			required: true
		},
		issuedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Player',
			required: true
		},
		musteredUnit: {
			type: String,
			enum: ['soldier', 'priest']
		},
		soldiers: Number,
		priests: Number
	},
	{
		timestamps: true
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

commandSchema.methods.executeCommand = function executeCommand() {

	// CHECK IF COMMAND IS VALID
	if (this.issuedBy !== this.originTerritory.controlledBy) {

		// command was cancelled, notify player
		return
	}
	
	switch (this.type) {
		case 'advance':
			// detectCombat will move units in or resolve combat then move units in
			this.detectCombat()
			break
		case 'excise':
			// this command cannot be a valid option in front end if territory wealth < 1 or no priests, this is backend double check
			if (this.originTerritory.wealth < 1 || !this.originTerritory.units.map(unit => { return unit.type }).includes('priest')) {
				console.log("you can't tax without wealth nor without tax collectors")
				break
			} else {
				this.issuedBy.gold += this.originTerritory.wealth
				this.originTerritory.wealth -= 1
				break
			}
		case 'muster':
			// this command cannot be a valid option in front end if territory population < 1 or no priests, this is backend double check
			if (this.originTerritory.population < 1 || !this.originTerritory.units.map(unit => { return unit.type }).includes('priest')) {
				console.log("you can't recruit without recruits nor without recruiters")
				break
			} else {
				// create new unit and add to origin's units
				let newUnit = {}
				if (this.musteredUnit === 'soldier') {
					// back end check if you can afford this
					if (this.issuedBy.gold < 2) {
						console.log('not enough gold')
						break
					} else {
						newUnit = {
							type: 'soldier',
							strength: 2,
							isFatigued: false,
							commander: this.issuedBy,
							upkeepCost: 2
						}
						this.issuedBy.gold -= 2
						this.originTerritory.abundance -= 1
					}
				} else if (this.musteredUnit === 'priest') {
					// back end check if you can afford this
					if (this.issuedBy.gold < 5) {
						console.log('not enough gold')
						break
					} else {
						newUnit = {
							type: 'priest',
							strength: 1,
							isFatigued: false,
							commander: this.issuedBy,
							upkeepCost: 1
						}
						this.issuedBy.gold -= 5
						this.originTerritory.abundance -= 1
					}
				}
				// assuming peasants, rather than being full units in their own right, are just numeric representations of population
				this.originTerritory.population -= 1
				this.originTerritory.units.push(newUnit)
				break
			}
		case 'sow':
			// this command cannot be a valid option in front end if population < 1, this is backend double check
			if (this.originTerritory.population < 1) {
				console.log('you need peasants to sow')
				break
			} else {
				this.originTerritory.population += 1
				this.originTerritory.abundance += 2
			}
		default:
			break
	}
}

// for moving marching units from one territory into another
commandSchema.methods.unitsMarchIn = function unitsMarchIn() {
	for (let i = 0; i < soldiers; i++) {
		let index = this.originTerritory.units.map(unit => { return unit.type }).indexOf('soldier')
		this.newTerritory.units.push(this.originTerritory.units.splice(index, 1)[0])
	}
	for (let i = 0; i < priests; i++) {
		let index = this.originTerritory.units.map(unit => { return unit.type }).indexOf('priest')
		this.newTerritory.units.push(this.originTerritory.units.splice(index, 1)[0])
	}
}

// potential combat detection, run in 'advance' command function
commandSchema.methods.detectCombat = function detectCombat() {
	if (!this.newTerritory.controlledBy ||
		this.newTerritory.controlledBy === this.originTerritory.controlledBy ||
		(!this.newTerritory.units.map(unit => { return unit.type }).includes('soldier') &&
			!this.newTerritory.units.map(unit => { return unit.type }).includes('priest'))) {

		// move in units
		// don't know if I have to use THIS here
		this.unitsMarchIn()
		this.newTerritory.controlledBy = this.originTerritory.controlledBy
	}
	else {
		// promise for these nonexistent function that probably async player input same as command phase in miniature
		let attackFormation = getAttackFormation()
		let defenseFormation = getDefenseFormation()

		// run combat with formation arguments
		this.combat(attackFormation, defenseFormation)
	}
}

// potential combat function
commandSchema.methods.combat = function combat(originTerrFormation, newTerrFormation) {

	// grab initial attack strength
	let attackStrength = this.priests + (this.soldiers * 2)

	// bonus for leadership
	if (this.priests) {
		attackStrength += this.soldiers
	}

	// initial defense strength
	let defenseStrength = this.newTerritory.units.map(unit => { return unit.strength }).reduce((total, unitStrength) => total + unitStrength, 0)

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
		this.newTerritory.units = []

		// move in units
		// don't know if I have to use THIS here
		this.unitsMarchIn()
		this.newTerritory.controlledBy = this.originTerritory.controlledBy
	} else {
		// destroy all attackers
		for (let i = 0; i < soldiers; i++) {
			let index = this.originTerritory.units.map(unit => { return unit.type }).indexOf('soldier')
			this.originTerritory.units.splice(index, 1)
		}
		for (let i = 0; i < priests; i++) {
			let index = this.originTerritory.units.map(unit => { return unit.type }).indexOf('priest')
			this.originTerritory.units.splice(index, 1)
		}
	}
}

module.exports = commandSchema
