const mongoose = require('mongoose')
const dice = require('../scripts/scripts')
const Territory = require('./territory')
const Player = require('./player')

const commandSchema = new mongoose.Schema(
	{
        advanceOrder: Number,
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
		commanderSeason: {
			type: String,
			enum: ['spring', 'summer', 'autumn', 'winter']
		},
		soldiersMarching: Number,
		priestsMarching: Number,
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

commandSchema.methods.executeCommand = async function executeCommand() {
    let parent = this.parent()
    console.log('command type: ', this.type)
	let commander = parent._id

	let origin = await Territory.findById(this.originTerritory)
    // console.log('look at me... Im the origin:', origin)

	let target

	if (this.newTerritory) {
		target = await Territory.findById(this.newTerritory)
	}

    // saves all the pulled in documents
    const updateDocs = () => {
        origin.save()
        parent.save()
        if (target) {
            target.save()
        }
    }

	// for moving marching units from one territory into another
	const unitsMarchIn = function unitsMarchIn() {
		origin.soldiers -= soldiersMarching
		target.soldiers += soldiersMarching
		origin.priests -= priestsMarching
		target.priests += priestsMarching
		target.controlledBy = origin.controlledBy
	}

	// // CHECK IF COMMAND IS VALID
	// if (this.issuedBy != origin.controlledBy) {
    //     console.log(this.issuedBy)
    //     console.log(origin.controlledBy)
    //     console.log('valid command? ',this.issuedBy != origin.controlledBy)
	// 	// command was cancelled, notify player
	// 	return false
	// }

	switch (this.type) {
		// case 'advance':
		// 	// detectCombat will move units in or resolve combat then move units in
		// 	if (this.detectCombat()) {
		// 		// let originTerrFormation = PROMISEGetThisFormationPROMISE()
		// 		// let newTerrFormation = PROMISEGetThisFormationPROMISE()

		// 		// if (this.combat(origin, originTerrFormation, target, newTerrFormation)){
		// 		// 	unitsMarchIn()
		// 		// }
		// 		return "combat"

		// 	} else {
		// 		unitsMarchIn()
		// 		updateDocs()
        //         return true
		// 	}
        //     break
		case 'excise':
			// this command cannot be a valid option in front end if territory wealth < 1 or no priests, this is backend double check
			if (origin.wealth < 1 || !origin.priests) {
				console.log("you can't tax without wealth nor without tax collectors")
				return false
			} else {
				commander.gold += origin.wealth
				origin.wealth -= 1
                updateDocs()
				return true
			}
            break
		case 'muster':
			// this command cannot be a valid option in front end if territory population < 1 or no priests, this is backend double check
			if (origin.population < 1 || !origin.priests) {
				console.log("you can't recruit without recruits nor without recruiters")
				return false
			} else {
				// create new unit and add to origin's units
				if (this.musteredUnit === 'soldier') {
					// back end check if you can afford this
					if (commander.gold < 2) {
						console.log('not enough gold')
						return false
					} else {
						origin.soldiers += 1
						commander.gold -= 2
						origin.abundance -= 1                        
					}
				} else if (this.musteredUnit === 'priest') {
					// back end check if you can afford this
					if (commander.gold < 5) {
						console.log('not enough gold')
						return false
					} else {
						origin.priests += 1
						commander.gold -= 5
						origin.abundance -= 1
					}
				}
				// assuming peasants, rather than being full units in their own right, are just numeric representations of population
				origin.population -= 1
				updateDocs()
				return true
			}
            break
		case 'sow':
			// this command cannot be a valid option in front end if population < 1, this is backend double check
			if (origin.population < 1) {
				console.log('you need peasants to sow')
				return false
			} else {
                console.log('pre sow: ',origin.population,origin.abundance)
				origin.population += 1
				origin.abundance += 2
                console.log('post sow: ',origin.population,origin.abundance)
                await updateDocs()
                return true
			}
            break
		default:
			return null
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
commandSchema.methods.combat = function combat(originTerrFormation, newTerrFormation) {

	let commander = Player.findById(this.issuedBy.id)

	let origin = Territory.findById(this.originTerritory.id)

	let target

	if (this.newTerritory) {
		target = Territory.findById(this.newTerritory.id)
	}

    // saves all the pulled in documents
    const updateDocs = function updateDocs() {
        origin.save()
        commander.save()
        if (target) {
            target.save()
        }
    }

	// for moving marching units from one territory into another
	const unitsMarchIn = function unitsMarchIn() {
		origin.soldiers -= soldiersMarching
		target.soldiers += soldiersMarching
		origin.priests -= priestsMarching
		target.priests += priestsMarching
		target.controlledBy = origin.controlledBy
	}

	// grab initial attack strength
	let attackStrength = this.priestsMarching + (this.soldiersMarching * 2)

	// bonus for leadership
	if (this.priestsMarching) {
		attackStrength += this.soldiersMarching
	}

	// initial defense strength
	let defenseStrength = this.newTerritory.priests + (2 * this.newTerritory.soldiers)

	// bonus for leadership
	if (this.newTerritory.priests) {
		defenseStrength += target.soldiers
	}

	// mountain terrain buff
	if (origin.type === 'mountain' && this.newTerritory.type !== 'mountain') {
		attackStrength += 3
	} else if (this.newTerritory.type === 'mountain' && origin.type !== 'mountain') {
		defenseStrength += 3
	}

	// formation bonus, most significant by far so perhaps should come before some other bonuses
	let attRoll = dice.roll(originTerrFormation)
	let defRoll = dice.roll(newTerrFormation)

	if (attRoll > defRoll) {
		attackStrength *= 2
	} else {
		defenseStrength *= 2
	}

	// result
	if (attackStrength > defenseStrength) {
		// destroy all defenders
		target.priests = 0
		target.soldiers = 0
		unitsMarchIn()
	} else {
		// destroy all attackers
		origin.priests -= this.priestsMarching
		origin.soldiers -= this.soldiersMarching
	}
	updateDocs()

	return {
		attRoll: attRoll,
		defRoll: defRoll,
		attackFinal: attackStrength,
		defenseFinal: defenseStrength
	}
}

module.exports = commandSchema
