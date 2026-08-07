const colors = ['Y', 'O', 'W', 'G', 'R', 'B', 'P', 'K'];
let secretCode = [];
let maxGuesses = 0;
let guessesLeft = 0;

document.getElementById('open-games-modal').addEventListener('click', () => {
    document.getElementById('games-modal').style.display = 'block';
});

document.getElementById('close-games-modal').addEventListener('click', () => {
    document.getElementById('games-modal').style.display = 'none';
});

document.getElementById('start-game-btn').addEventListener('click', () => {
    const diff = document.getElementById('game-difficulty').value;
    if(diff === 'easy') { secretCode = genCode(4); maxGuesses = 7; }
    else if(diff === 'normal') { secretCode = genCode(5); maxGuesses = 12; }
    else { secretCode = genCode(6); maxGuesses = 15; }
    
    guessesLeft = maxGuesses;
    renderGame();
});

function genCode(len) {
    let c = [];
    for(let i=0; i<len; i++) c.push(colors[Math.floor(Math.random() * (diff === 'easy' ? 5 : diff === 'normal' ? 6 : 8))]);
    return c;
}

// Logic for Checking
function checkGuess(guess) {
    let correctPos = 0;
    let correctColor = 0;
    let secretTemp = [...secretCode];
    let guessTemp = [...guess];

    // Correct Position
    for(let i=0; i<guess.length; i++) {
        if(guess[i] === secretTemp[i]) {
            correctPos++;
            secretTemp[i] = null;
            guessTemp[i] = null;
        }
    }
    // Correct Color
    for(let i=0; i<guess.length; i++) {
        if(guessTemp[i] && secretTemp.includes(guessTemp[i])) {
            correctColor++;
            secretTemp[secretTemp.indexOf(guessTemp[i])] = null;
        }
    }
    return { pos: correctPos, color: correctColor };
}

