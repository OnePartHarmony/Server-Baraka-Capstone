const mongoose = require('mongoose')
const dice = require('../scripts/scripts')
const Territory = require('./territory')
const Player = require('./player')

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
			ref: 'Territory'
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
		soldiersMarching: Number,
		priestsMarching: Number
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

	let commander = Player.findById(this.issuedBy.id)

	let origin = Territory.findById(this.originTerritory.id)

	let target

	if (this.newTerritory) {
		target = Territory.findById(this.newTerritory.id)
	}

	// for moving marching units from one territory into another
	const unitsMarchIn = function unitsMarchIn() {
		origin.soldiers -= soldiersMarching
		target.soldiers += soldiersMarching
		origin.priests -= priestsMarching
		target.priests += priestsMarching
		target.controlledBy = origin.controlledBy
	}

	// CHECK IF COMMAND IS VALID
	if (this.issuedBy !== origin.controlledBy) {

		// command was cancelled, notify player
		return
	}

	switch (this.type) {
		case 'advance':
			// detectCombat will move units in or resolve combat then move units in
			if (this.detectCombat()) {
				let originTerrFormation = GetThisFormationPROMISE()
				let newTerrFormation = GetThisFormationPROMISE()

				if (this.combat(origin, originTerrFormation, target, newTerrFormation)){
					unitsMarchIn()
				}
			} else {
				unitsMarchIn()
			}
			break
		case 'excise':
			// this command cannot be a valid option in front end if territory wealth < 1 or no priests, this is backend double check
			if (origin.wealth < 1 || !origin.priests) {
				console.log("you can't tax without wealth nor without tax collectors")
				break
			} else {
				commander.gold += origin.wealth
				origin.wealth -= 1
				break
			}
		case 'muster':
			// this command cannot be a valid option in front end if territory population < 1 or no priests, this is backend double check
			if (origin.population < 1 || !origin.priests) {
				console.log("you can't recruit without recruits nor without recruiters")
				break
			} else {
				// create new unit and add to origin's units
				if (this.musteredUnit === 'soldier') {
					// back end check if you can afford this
					if (commander.gold < 2) {
						console.log('not enough gold')
						break
					} else {
						origin.soldiers += 1
						commander.gold -= 2
						origin.abundance -= 1
					}
				} else if (this.musteredUnit === 'priest') {
					// back end check if you can afford this
					if (commander.gold < 5) {
						console.log('not enough gold')
						break
					} else {
						origin.priests += 1
						commander.gold -= 5
						origin.abundance -= 1
					}
				}
				// assuming peasants, rather than being full units in their own right, are just numeric representations of population
				origin.population -= 1
				break
			}
		case 'sow':
			// this command cannot be a valid option in front end if population < 1, this is backend double check
			if (origin.population < 1) {
				console.log('you need peasants to sow')
				break
			} else {
				origin.population += 1
				origin.abundance += 2
			}
		default:
			break
	}
}

// potential combat detection, run in 'advance' command function
commandSchema.methods.detectCombat = function detectCombat() {
	if (!this.newTerritory.controlledBy ||
		this.newTerritory.controlledBy === this.originTerritory.controlledBy ||
		(!target.soldiers && !target.priests) ) {

		return true
	}
	else {

		return false
	}
}

// potential combat function
commandSchema.methods.combat = function combat(origin, originTerrFormation, target, newTerrFormation) {

	// grab initial attack strength
	let attackStrength = this.priestsMarching + (this.soldiersMarching * 2)

	// bonus for leadership
	if (this.priestsMarching) {
		attackStrength += this.soldiersMarching
	}

	// initial defense strength
	let defenseStrength = target.priests + (2 * target.soldiers)

	// bonus for leadership
	if (target.priests) {
		defenseStrength += target.soldiers
	}

	// mountain terrain buff
	if (origin.type === 'mountain' && target.type !== 'mountain') {
		attackStrength += 3
	} else if (target.type === 'mountain' && origin.type !== 'mountain') {
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
		target.priests = 0
		target.soldiers = 0

		return true
	} else {
		// destroy all attackers
		origin.priests -= this.priestsMarching
		origin.soldiers -= this.soldiersMarching

		return false
	}
}

module.exports = commandSchema
