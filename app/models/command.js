const mongoose = require('mongoose')
const randomRange = require('../scripts/scripts')
const Territory = require('./territory')

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
		soldiersMarching: {
            type: Number,
            default: 0
        },
		priestsMarching: {
            type: Number,
            default: 0
        },
        commanderSeason: {
            type: String,
            enum: ['spring', 'summer', 'autumn', 'winter']
        },
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
    // let parent = this.parent()
    // console.log('command type: ', this.type)
	let commander = this.parent()

	let origin = await Territory.findById(this.originTerritory)
    // console.log('look at me... Im the origin:', origin)

	let target

	if (this.newTerritory) {
        // console.log('a new terr')
		target = await Territory.findById(this.newTerritory)
	}

    // saves all the pulled in documents
    const updateDocs = () => {
        origin.save()
        commander.save()
        if (target) {
            target.save()
        }
    }

	// CHECK IF COMMAND IS VALID
	if (!this.issuedBy.equals(origin.controlledBy)) {
		console.log('falseOwnership', this.issuedBy.equals(origin.controlledBy))
		return false
	}

	switch (this.type) {
		case 'advance':
			// detectCombat will move units in or resolve combat then move units in
			if (this.detectCombat(origin, target)) {
                const fought = await this.combat(commander, origin, target)
				return fought
			} else {
				// unitsMarchIn()
				// updateDocs()
                origin.soldiers -= this.soldiersMarching
		        target.soldiers += this.soldiersMarching
		        origin.priests -= this.priestsMarching
		        target.priests += this.priestsMarching
		        target.controlledBy = origin.controlledBy
                updateDocs()
                return true
			}
            break
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
commandSchema.methods.detectCombat = function detectCombat(origin, target) {
    
	if (!target.controlledBy ||
		target.controlledBy === origin.controlledBy ||
		(!target.soldiers && !target.priests) ) {

		return false
	}
	else {

		return true
	}
}

// potential combat function
commandSchema.methods.combat = async function combat(commander, origin, target) {

    const attackFormation = commander.formationName
	/////NEED a way to get defender formation
    // const defender = await Player.findById(target.controlledBy)
    // const defenseFormation = defender.formation
	const defenseFormation = attackFormation

    // saves all the pulled in documents
    const updateDocs = () => {
        origin.save()
        commander.save()
        target.save()
    }

	// for moving marching units from one territory into another
	// const unitsMarchIn = function unitsMarchIn() {
	// 	origin.soldiers -= soldiersMarching
	// 	target.soldiers += soldiersMarching
	// 	origin.priests -= priestsMarching
	// 	target.priests += priestsMarching
	// 	target.controlledBy = origin.controlledBy
    //     updateDocs()
	// }

	// grab initial attack strength
	let attackStrength = this.priestsMarching + (this.soldiersMarching * 2)
	console.log("attackStrength", attackStrength)

	// bonus for leadership
	if (this.priestsMarching) {
		attackStrength += this.soldiersMarching
	}

	// initial defense strength
	let defenseStrength = target.priests + (2 * target.soldiers)
	console.log("defenseStrength", defenseStrength)

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

	// dice.roll('charge') rolls the charge die
	const dice = {
		'Hedgehog': [0, 5, 5, 5, 5, 5],
		'Phalanx': [1, 1, 6, 6, 6, 6],
		'Skirmish': [2, 2, 2, 7, 7, 7],
		'Flanking': [3, 3, 3, 3, 8, 8],
		'Charging': [4, 4, 4, 4, 4, 9],
		roll: function (formation) {
			return dice[formation][randomRange(0, 5)]
		}
	}
	// formation bonus, most significant by far so perhaps should come before some other bonuses
	let attRoll = dice.roll(attackFormation)
	let defRoll = dice.roll(defenseFormation)

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
        origin.soldiers -= this.soldiersMarching
		target.soldiers += this.soldiersMarching
		origin.priests -= this.priestsMarching
		target.priests += this.priestsMarching
		target.controlledBy = origin.controlledBy
	} else {
		// destroy all attackers
		origin.priests -= this.priestsMarching
		origin.soldiers -= this.soldiersMarching
	}

	updateDocs()
    return true
	// return {
	// 	attRoll: attRoll,
	// 	defRoll: defRoll,
	// 	attackFinal: attackStrength,
	// 	defenseFinal: defenseStrength
	// }
}

module.exports = commandSchema
