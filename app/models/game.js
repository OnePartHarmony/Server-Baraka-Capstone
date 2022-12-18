const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')
const { orderOfSeasons } = require('../constants')
const commandSchema = require('./command')
const playerSchema = require('./player')
const territorySchema = require('./territory')

const gameSchema = new mongoose.Schema(
	{
		roomId: {
			type: String,
			required: true,
            unique: true
		},
        numberOfPlayers: {
            type: Number,
            required: true,
            // include 1 in this enum for quick testing of auto-initialize
            enum: [1, 2, 3, 4]
        },
		territories: [territorySchema],
		players: [playerSchema],
        command: {
            type: Boolean,
            required: true,
            default: false
        },
        currentPhase: {
            type: String,
            enum: ['advance', 'battle', 'excise', 'muster', 'sow'],
        },
        currentSeason: {
            type: String,
            enum: ['spring', 'summer', 'autumn', 'winter'],
        },
        allSeasons: {
            type: Array,
            default: [],
            required: true
        },
        placementOrder: [],
        pendingCommands: [commandSchema],
        host: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: false,
		},
    },
	{
		timestamps: true,
	}
)


// this method orders the seasons in game correctly
// and then sets the initial unit placement order
// that order is as follows: in order of seasons, each player places one unit, and then each player places an additional unit in reverse starting from the last player
gameSchema.methods.orderSeasons = function orderSeasons() {
    const arr = []
    orderOfSeasons.forEach(season => {
        if (this.allSeasons.includes(season)) {
            arr.push(season)
        }
    })
    this.allSeasons = arr
    this.placementOrder = this.allSeasons.concat(arr.reverse())
}

// this method just sets the next season based on available seasons
gameSchema.methods.nextSeason = function nextSeason() {
    let index = this.allSeasons.indexOf(this.currentSeason) + 1
    if (index === this.allSeasons.length) {
        index = 0
    }
    return this.currentSeason = this.allSeasons[index]
}

gameSchema.methods.nextPhase = function nextPhase() {
    const phases = ['advance', 'excise', 'muster', 'sow']
    let index = phase.indexOf(this.currentPhase)
    index === phases.length? this.currentPhase = phases[0] : this.currentPhase = phases[index]

}

module.exports = mongoose.model('Game', gameSchema)
