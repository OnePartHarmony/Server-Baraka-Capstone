const { adjacents, biomes } = require('../constants')

// random number from min to max inclusive
const randomRange = (min, max) => {
    return Math.floor(Math.random() * (max + 1 - min) + min)
}

// create random map
const initializeMap = (gameId) => {
    const arr = []
    for (let i = 0; i < adjacents.length; i++) {
        let type = ''
        let wealth, abundance, population = 0
        if (i > 0) {
            if (arr[i-1].type === 'water') {
                type = biomes[randomRange(0,2)]
            } else {
                type = biomes[randomRange(0,3)]
            }
        }
        switch (type) {
            case 'field':
                wealth = randomRange(1,2)
                abundance = randomRange(2,3)
                population = randomRange(1,2)
                break
            case 'farmland':
                wealth = randomRange(3,5)
                abundance = randomRange(4,6)
                population = randomRange(3,5)
                break
            case 'mountain':
                wealth = randomRange(0,1)
                abundance = randomRange(1,2)
                population = randomRange(0,1)
                break
            case 'water':
                break
        }
        arr.push(
            {
                number: i,
                type: type,
                wealth: wealth,
                abundance: abundance,
                adjacents: adjacents[i],
                population: population,
                gameId: gameId 
            }
        )
    }
    // console.log(arr)
    return arr    
}


module.exports = initializeMap