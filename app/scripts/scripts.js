const adjacents = require('../constants')


const initializeMap = (gameId) => {
    const arr = []
    for (let i = 0; i < adjacents.length; i++) {
        arr.push(
            {
               type: 'field',
               wealth: 2,
               abundance: 2,
               adjacents: adjacents[i],
               population: 0,
               gameId: gameId 
            }
        )
    }
    // console.log(arr)
    return arr    
}

module.exports = initializeMap