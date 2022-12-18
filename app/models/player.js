const mongoose = require('mongoose')

const commandSchema = require('./command')

const playerSchema = new mongoose.Schema(
	{
        user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
        gold: {
            type: Number,
            default: 5,
            required: true,
        },
        season: {
            type: String,
            required: true,
            enum: ['spring', 'summer', 'autumn', 'winter']
        },
        score: {
            type: Number,
            default: 0,
            required: true
        },
        formationName: String,
        advanceCommands: [commandSchema],
        exciseCommands: [commandSchema],
        musterCommands: [commandSchema],
        sowCommands: [commandSchema],
    },
	{
		timestamps: true,
	}
)

playerSchema.methods.resetCommands = async function resetCommands() {
    this.commands = []
    return this.save()
}


module.exports = playerSchema
