// --- Navigation Logic ---
const openHubBtn = document.getElementById('open-games-modal');
const hubModal = document.getElementById('games-hub-modal');
const closeHubBtn = document.getElementById('close-games-hub');
const dropdownMenu = document.getElementById('dropdown-menu');

const openCGBtn = document.getElementById('btn-open-code-guess');
const cgModal = document.getElementById('code-guess-modal');
const backToHubBtn = document.getElementById('back-to-hub');

if (openHubBtn) {
    openHubBtn.addEventListener('click', () => {
        hubModal.style.display = 'block';
        dropdownMenu.style.display = 'none';
    });
}
if (closeHubBtn) closeHubBtn.addEventListener('click', () => hubModal.style.display = 'none');

// Open Code Guess from Hub
if (openCGBtn) {
    openCGBtn.addEventListener('click', () => {
        hubModal.style.display = 'none';
        cgModal.style.display = 'block';
    });
}
if (backToHubBtn) {
    backToHubBtn.addEventListener('click', () => {
        cgModal.style.display = 'none';
        hubModal.style.display = 'block';
    });
}

// ==========================================
// CODE GUESS GAME LOGIC
// ==========================================
const colorMap = {
    'Y': { hex: '#f1c40f', name: 'Yellow' },
    'O': { hex: '#e67e22', name: 'Orange' },
    'W': { hex: '#ffffff', name: 'White' },
    'G': { hex: '#2ecc71', name: 'Green' },
    'R': { hex: '#e74c3c', name: 'Red' },
    'B': { hex: '#3498db', name: 'Blue' },
    'P': { hex: '#9b59b6', name: 'Purple' },
    'K': { hex: '#ff9ff3', name: 'Pink' } // Using Pink instead of Black to be visible on dark mode
};

const allColorsKeys = ['Y', 'O', 'W', 'G', 'R', 'B', 'P', 'K'];

let secretCode = [];
let currentGuess = [];
let maxGuesses = 0;
let guessesLeft = 0;
let codeLength = 0;
let allowedColorsCount = 0;

// UI Elements
const cgSetup = document.getElementById('cg-setup');
const cgGameArea = document.getElementById('cg-game-area');
const cgGuessesLeftTxt = document.getElementById('cg-guesses-left');
const cgColorPicker = document.getElementById('cg-color-picker');
const cgCurrentGuessBox = document.getElementById('cg-current-guess');
const cgHistory = document.getElementById('cg-history');

document.getElementById('cg-start-btn').addEventListener('click', startGame);
document.getElementById('cg-quit-btn').addEventListener('click', quitGame);
document.getElementById('cg-clear-btn').addEventListener('click', clearGuess);
document.getElementById('cg-submit-btn').addEventListener('click', submitGuess);

function startGame() {
    const diff = document.getElementById('cg-difficulty').value;
    
    // Set variables based on difficulty
    if (diff === 'easy') { codeLength = 4; maxGuesses = 7; allowedColorsCount = 5; } // Uses Y,O,W,G,R
    else if (diff === 'normal') { codeLength = 5; maxGuesses = 12; allowedColorsCount = 6; } // Uses Y,O,W,G,R,B
    else if (diff === 'hard') { codeLength = 6; maxGuesses = 15; allowedColorsCount = 8; } // Uses All
    
    guessesLeft = maxGuesses;
    currentGuess = [];
    secretCode = [];
    
    // Generate Random Secret Code (Colors can repeat)
    for (let i = 0; i < codeLength; i++) {
        let randomKey = allColorsKeys[Math.floor(Math.random() * allowedColorsCount)];
        secretCode.push(randomKey);
    }
    
    console.log("Secret Code (Cheat!):", secretCode); // For debugging
    
    // Setup UI
    cgSetup.style.display = 'none';
    cgGameArea.style.display = 'block';
    cgGuessesLeftTxt.innerText = guessesLeft;
    cgHistory.innerHTML = ''; // Clear history
    updateCurrentGuessUI();
    generateColorButtons();
}

function quitGame() {
    cgGameArea.style.display = 'none';
    cgSetup.style.display = 'block';
}

function generateColorButtons() {
    cgColorPicker.innerHTML = '';
    for (let i = 0; i < allowedColorsCount; i++) {
        let colorKey = allColorsKeys[i];
        let colorData = colorMap[colorKey];
        
        let btn = document.createElement('div');
        btn.style.width = '30px';
        btn.style.height = '30px';
        btn.style.borderRadius = '50%';
        btn.style.backgroundColor = colorData.hex;
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
        btn.style.border = '2px solid rgba(255,255,255,0.2)';
        
        btn.addEventListener('click', () => {
            if (currentGuess.length < codeLength) {
                currentGuess.push(colorKey);
                updateCurrentGuessUI();
            }
        });
        cgColorPicker.appendChild(btn);
    }
}

function updateCurrentGuessUI() {
    cgCurrentGuessBox.innerHTML = '';
    
    // Show selected colors
    for (let i = 0; i < codeLength; i++) {
        let slot = document.createElement('div');
        slot.style.width = '25px';
        slot.style.height = '25px';
        slot.style.borderRadius = '50%';
        slot.style.border = '2px dashed rgba(255,255,255,0.3)';
        
        if (currentGuess[i]) {
            slot.style.backgroundColor = colorMap[currentGuess[i]].hex;
            slot.style.border = '2px solid white';
        }
        cgCurrentGuessBox.appendChild(slot);
    }
}

function clearGuess() {
    currentGuess = [];
    updateCurrentGuessUI();
}

function submitGuess() {
    if (currentGuess.length < codeLength) {
        alert(`Please select ${codeLength} colors!`);
        return;
    }
    
    // Mastermind Logic: Evaluate Correct Pos vs Correct Color
    let exactMatches = 0;
    let colorMatches = 0;
    
    // Create copies so we don't modify the real secret
    let tempSecret = [...secretCode];
    let tempGuess = [...currentGuess];
    
    // Step 1: Find Exact Matches (Correct Color & Position)
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] === tempSecret[i]) {
            exactMatches++;
            tempSecret[i] = null; // Mark as counted
            tempGuess[i] = null;  // Mark as counted
        }
    }
    
    // Step 2: Find Color Matches (Correct Color, Wrong Position)
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] !== null) {
            let foundIndex = tempSecret.indexOf(tempGuess[i]);
            if (foundIndex !== -1) {
                colorMatches++;
                tempSecret[foundIndex] = null; // Mark as counted
            }
        }
    }
    
    // Add to History UI
    addHistoryRow(currentGuess, exactMatches, colorMatches);
    
    guessesLeft--;
    cgGuessesLeftTxt.innerText = guessesLeft;
    
    // Check Win or Lose
    if (exactMatches === codeLength) {
        alert("🎉 YOU WON! You cracked the code!");
        quitGame();
    } else if (guessesLeft === 0) {
        alert(`❌ GAME OVER! The code was: ${secretCode.join(' ')}`);
        quitGame();
    } else {
        clearGuess(); // Reset for next guess
    }
}

function addHistoryRow(guessArr, exact, color) {
    let row = document.createElement('div');
    row.style.background = 'rgba(255,255,255,0.1)';
    row.style.padding = '8px';
    row.style.borderRadius = '6px';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    
    // Left: The Colors guessed
    let colorsDiv = document.createElement('div');
    colorsDiv.style.display = 'flex';
    colorsDiv.style.gap = '4px';
    
    guessArr.forEach(c => {
        let dot = document.createElement('div');
        dot.style.width = '15px';
        dot.style.height = '15px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = colorMap[c].hex;
        colorsDiv.appendChild(dot);
    });
    
    // Right: Feedback
    let feedbackDiv = document.createElement('div');
    feedbackDiv.style.fontSize = '10px';
    feedbackDiv.innerHTML = `<span style="color:#2ecc71;">${exact} Pos</span> | <span style="color:#f1c40f;">${color} Col</span>`;
    
    row.appendChild(colorsDiv);
    row.appendChild(feedbackDiv);
    
    cgHistory.prepend(row); // Add to top of list
}
