import { auth, db } from './firebase.js';
import { ref, get, child, update } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// --- Navigation Logic ---
const mainOpenGamesBtn = document.getElementById('main-open-games-btn');
const navOpenGamesBtn = document.getElementById('nav-open-games');
const hubModal = document.getElementById('games-hub-modal');
const closeHubBtn = document.getElementById('close-games-hub');
const dropdownMenu = document.getElementById('dropdown-menu');

const openCGBtn = document.getElementById('btn-open-code-guess');
const cgModal = document.getElementById('code-guess-modal');
const backToHubCGBtn = document.getElementById('back-to-hub-cg');

const openMMBtn = document.getElementById('btn-open-memory-match');
const mmModal = document.getElementById('memory-match-modal');
const backToHubMMBtn = document.getElementById('back-to-hub-mm');

// Tabs Logic
const tabPlayGames = document.getElementById('tab-play-games');
const tabLeaderboard = document.getElementById('tab-leaderboard');
const secPlayGames = document.getElementById('sec-play-games');
const secLeaderboard = document.getElementById('sec-leaderboard');
const lbGameSelect = document.getElementById('lb-game-select');

function openHub() {
    hubModal.style.display = 'block';
    if(dropdownMenu) dropdownMenu.style.display = 'none';
}

if(mainOpenGamesBtn) mainOpenGamesBtn.addEventListener('click', openHub);
if(navOpenGamesBtn) navOpenGamesBtn.addEventListener('click', openHub);
if(closeHubBtn) closeHubBtn.addEventListener('click', () => hubModal.style.display = 'none');

if(tabPlayGames) {
    tabPlayGames.addEventListener('click', () => {
        secPlayGames.style.display = 'block';
        secLeaderboard.style.display = 'none';
        tabPlayGames.style.background = '#9b59b6';
        tabLeaderboard.style.background = '#555';
    });
}

if(tabLeaderboard) {
    tabLeaderboard.addEventListener('click', () => {
        secPlayGames.style.display = 'none';
        secLeaderboard.style.display = 'block';
        tabLeaderboard.style.background = '#9b59b6';
        tabPlayGames.style.background = '#555';
        loadLeaderboard(lbGameSelect.value);
    });
}

if(lbGameSelect) {
    lbGameSelect.addEventListener('change', () => loadLeaderboard(lbGameSelect.value));
}

// Nav: Hub to Code Guess
if (openCGBtn) {
    openCGBtn.addEventListener('click', () => {
        hubModal.style.display = 'none'; cgModal.style.display = 'block';
    });
}
if (backToHubCGBtn) {
    backToHubCGBtn.addEventListener('click', () => {
        cgModal.style.display = 'none'; hubModal.style.display = 'block';
    });
}

// Nav: Hub to Memory Match
if (openMMBtn) {
    openMMBtn.addEventListener('click', () => {
        hubModal.style.display = 'none'; mmModal.style.display = 'block';
    });
}
if (backToHubMMBtn) {
    backToHubMMBtn.addEventListener('click', () => {
        mmModal.style.display = 'none'; hubModal.style.display = 'block';
    });
}

// ==========================================
// UNIVERSAL POINTS & LEADERBOARD SYSTEM
// ==========================================
async function addPointsToUser(gameKey, ptsToAdd) {
    if(!auth.currentUser) return;
    try {
        const uid = auth.currentUser.uid;
        const ptsRef = child(ref(db), `users/${uid}/gamePoints/${gameKey}`);
        const snap = await get(ptsRef);
        let currentPts = snap.exists() ? snap.val() : 0;
        await update(ref(db, `users/${uid}/gamePoints`), { [gameKey]: currentPts + ptsToAdd });
    } catch(err) {
        console.error("Error adding points:", err);
    }
}

async function loadLeaderboard(gameKey) {
    const listDiv = document.getElementById('leaderboard-list');
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Top Players...</div>';
    
    try {
        const snap = await get(child(ref(db), 'users'));
        if(snap.exists()) {
            let players = [];
            snap.forEach(childSnap => {
                let data = childSnap.val();
                let pts = data.gamePoints && data.gamePoints[gameKey] ? data.gamePoints[gameKey] : 0;
                if(pts > 0) {
                    players.push({
                        username: data.username || 'unknown',
                        photo: data.profilePhoto || 'default-profile.png',
                        points: pts
                    });
                }
            });
            
            players.sort((a, b) => b.points - a.points);
            players = players.slice(0, 10);
            
            if(players.length === 0) {
                listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">No one has points yet! Be the first!</div>';
                return;
            }
            
            listDiv.innerHTML = '';
            players.forEach((p, index) => {
                let rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                let rankColor = index < 3 ? rankColors[index] : '#aaa';
                let rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`;
                
                listDiv.innerHTML += `
                    <div style="display:flex; align-items:center; background:rgba(255,255,255,0.1); padding:8px 10px; border-radius:10px; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:14px; font-weight:bold; color:${rankColor}; width:25px; text-align:center;">${rankEmoji}</span>
                            <img src="${p.photo}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid ${rankColor};">
                            <span style="font-size:13px; font-weight:bold; color:white;">@${p.username}</span>
                        </div>
                        <span style="font-size:12px; font-weight:bold; color:#1db954;">${p.points} Pts</span>
                    </div>
                `;
            });
        } else {
            listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">No players found!</div>';
        }
    } catch(err) {
        listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#ff4757;">Error loading leaderboard</div>';
    }
}


// ==========================================
// 🧠 CODE GUESS GAME LOGIC
// ==========================================
const colorMap = {
    'Y': { hex: '#f1c40f', name: 'Yellow' }, 'O': { hex: '#e67e22', name: 'Orange' },
    'W': { hex: '#ffffff', name: 'White' },  'G': { hex: '#2ecc71', name: 'Green' },
    'R': { hex: '#e74c3c', name: 'Red' },    'B': { hex: '#3498db', name: 'Blue' },
    'P': { hex: '#9b59b6', name: 'Purple' }, 'K': { hex: '#ff9ff3', name: 'Pink' }
};

const allColorsKeys = ['Y', 'O', 'W', 'G', 'R', 'B', 'P', 'K'];
let secretCode = [];
let currentGuess = [];
let maxGuesses = 0; let guessesLeft = 0;
let codeLength = 0; let allowedColorsCount = 0;
let cgDifficulty = '';

const cgSetup = document.getElementById('cg-setup');
const cgGameArea = document.getElementById('cg-game-area');
const cgGuessesLeftTxt = document.getElementById('cg-guesses-left');
const cgColorPicker = document.getElementById('cg-color-picker');
const cgCurrentGuessBox = document.getElementById('cg-current-guess');
const cgHistory = document.getElementById('cg-history');

document.getElementById('cg-start-btn').addEventListener('click', () => {
    cgDifficulty = document.getElementById('cg-difficulty').value;
    if (cgDifficulty === 'easy') { codeLength = 4; maxGuesses = 7; allowedColorsCount = 5; }
    else if (cgDifficulty === 'normal') { codeLength = 5; maxGuesses = 12; allowedColorsCount = 6; }
    else if (cgDifficulty === 'hard') { codeLength = 6; maxGuesses = 15; allowedColorsCount = 8; }
    
    guessesLeft = maxGuesses; currentGuess = []; secretCode = [];
    for (let i = 0; i < codeLength; i++) secretCode.push(allColorsKeys[Math.floor(Math.random() * allowedColorsCount)]);
    
    cgSetup.style.display = 'none'; cgGameArea.style.display = 'block';
    cgGuessesLeftTxt.innerText = guessesLeft; cgHistory.innerHTML = ''; 
    cgUpdateUI(); cgGenButtons();
});

document.getElementById('cg-quit-btn').addEventListener('click', () => { cgGameArea.style.display = 'none'; cgSetup.style.display = 'block'; });
document.getElementById('cg-clear-btn').addEventListener('click', () => { currentGuess = []; cgUpdateUI(); });

document.getElementById('cg-submit-btn').addEventListener('click', async () => {
    if (currentGuess.length < codeLength) { alert(`Please select ${codeLength} colors!`); return; }
    
    let exactMatches = 0; let colorMatches = 0;
    let tempSecret = [...secretCode]; let tempGuess = [...currentGuess];
    
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] === tempSecret[i]) { exactMatches++; tempSecret[i] = null; tempGuess[i] = null; }
    }
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] !== null) {
            let idx = tempSecret.indexOf(tempGuess[i]);
            if (idx !== -1) { colorMatches++; tempSecret[idx] = null; }
        }
    }
    
    cgAddHistoryRow(currentGuess, exactMatches, colorMatches);
    guessesLeft--; cgGuessesLeftTxt.innerText = guessesLeft;
    
    if (exactMatches === codeLength) {
        let pts = cgDifficulty === 'easy' ? 1 : cgDifficulty === 'normal' ? 2 : 5;
        alert(`🎉 YOU WON! (+${pts} Points)`);
        await addPointsToUser('codeGuess', pts);
        document.getElementById('cg-quit-btn').click();
    } else if (guessesLeft === 0) {
        alert(`❌ GAME OVER! The code was: ${secretCode.join(' ')}`);
        document.getElementById('cg-quit-btn').click();
    } else { currentGuess = []; cgUpdateUI(); }
});

function cgGenButtons() {
    cgColorPicker.innerHTML = '';
    for (let i = 0; i < allowedColorsCount; i++) {
        let key = allColorsKeys[i];
        let btn = document.createElement('div');
        btn.style.width = '30px'; btn.style.height = '30px'; btn.style.borderRadius = '50%';
        btn.style.backgroundColor = colorMap[key].hex; btn.style.cursor = 'pointer'; btn.style.border = '2px solid rgba(255,255,255,0.2)';
        btn.addEventListener('click', () => { if (currentGuess.length < codeLength) { currentGuess.push(key); cgUpdateUI(); } });
        cgColorPicker.appendChild(btn);
    }
}

function cgUpdateUI() {
    cgCurrentGuessBox.innerHTML = '';
    for (let i = 0; i < codeLength; i++) {
        let slot = document.createElement('div');
        slot.style.width = '25px'; slot.style.height = '25px'; slot.style.borderRadius = '50%'; slot.style.border = '2px dashed rgba(255,255,255,0.3)';
        if (currentGuess[i]) { slot.style.backgroundColor = colorMap[currentGuess[i]].hex; slot.style.border = '2px solid white'; }
        cgCurrentGuessBox.appendChild(slot);
    }
}

function cgAddHistoryRow(arr, exact, col) {
    let row = document.createElement('div');
    row.style.background = 'rgba(255,255,255,0.1)'; row.style.padding = '8px'; row.style.borderRadius = '6px';
    row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center';
    
    let cDiv = document.createElement('div'); cDiv.style.display = 'flex'; cDiv.style.gap = '4px';
    arr.forEach(c => {
        let dot = document.createElement('div'); dot.style.width = '15px'; dot.style.height = '15px'; dot.style.borderRadius = '50%';
        dot.style.backgroundColor = colorMap[c].hex; cDiv.appendChild(dot);
    });
    
    let fDiv = document.createElement('div'); fDiv.style.fontSize = '10px';
    fDiv.innerHTML = `<span style="color:#2ecc71;">${exact} Pos</span> | <span style="color:#f1c40f;">${col} Col</span>`;
    row.appendChild(cDiv); row.appendChild(fDiv); cgHistory.prepend(row);
}


// ==========================================
// 🃏 MEMORY MATCH GAME LOGIC
// ==========================================
const mmEmojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝', '🥥', '🍑'];
let mmCards = [];
let mmFlippedCards = [];
let mmMatchedPairs = 0;
let mmTotalPairs = 0;
let mmMoves = 0;
let mmIsLocked = false;
let mmDifficulty = '';

const mmSetup = document.getElementById('mm-setup');
const mmGameArea = document.getElementById('mm-game-area');
const mmGrid = document.getElementById('mm-grid');
const mmMovesTxt = document.getElementById('mm-moves-txt');

document.getElementById('mm-start-btn').addEventListener('click', () => {
    mmDifficulty = document.getElementById('mm-difficulty').value;
    
    if (mmDifficulty === 'easy') { mmTotalPairs = 6; } // 12 cards
    else if (mmDifficulty === 'normal') { mmTotalPairs = 8; } // 16 cards
    else if (mmDifficulty === 'hard') { mmTotalPairs = 10; } // 20 cards
    
    mmMoves = 0; mmMatchedPairs = 0; mmFlippedCards = []; mmIsLocked = false;
    mmMovesTxt.innerText = mmMoves;
    
    // Setup Deck
    let deck = [];
    for (let i = 0; i < mmTotalPairs; i++) {
        deck.push(mmEmojis[i], mmEmojis[i]); // Add pair
    }
    // Shuffle
    deck.sort(() => 0.5 - Math.random());
    
    // Draw Grid
    mmGrid.innerHTML = '';
    deck.forEach((emoji, index) => {
        let card = document.createElement('div');
        card.style.height = '60px';
        card.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
        card.style.border = '1px solid rgba(255,255,255,0.2)';
        card.style.borderRadius = '8px';
        card.style.display = 'flex';
        card.style.justifyContent = 'center';
        card.style.alignItems = 'center';
        card.style.fontSize = '26px';
        card.style.cursor = 'pointer';
        card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        
        card.dataset.emoji = emoji;
        card.dataset.index = index;
        card.dataset.flipped = 'false';
        
        card.addEventListener('click', () => handleCardClick(card));
        mmGrid.appendChild(card);
    });
    
    mmSetup.style.display = 'none';
    mmGameArea.style.display = 'block';
});

document.getElementById('mm-quit-btn').addEventListener('click', () => {
    mmGameArea.style.display = 'none';
    mmSetup.style.display = 'block';
});

async function handleCardClick(card) {
    // Return if locked, already flipped, or max 2 cards already flipped
    if (mmIsLocked || card.dataset.flipped === 'true' || mmFlippedCards.length >= 2) return;
    
    // Flip card
    card.dataset.flipped = 'true';
    card.innerText = card.dataset.emoji;
    card.style.background = 'rgba(255,255,255,0.2)'; // Lighter bg when flipped
    
    mmFlippedCards.push(card);
    
    if (mmFlippedCards.length === 2) {
        mmMoves++;
        mmMovesTxt.innerText = mmMoves;
        mmIsLocked = true;
        
        let card1 = mmFlippedCards[0];
        let card2 = mmFlippedCards[1];
        
        if (card1.dataset.emoji === card2.dataset.emoji) {
            // Match found!
            card1.style.background = 'rgba(46, 204, 113, 0.4)'; // Greenish
            card2.style.background = 'rgba(46, 204, 113, 0.4)';
            mmMatchedPairs++;
            mmFlippedCards = [];
            mmIsLocked = false;
            
            // Check Win
            if (mmMatchedPairs === mmTotalPairs) {
                let pts = mmDifficulty === 'easy' ? 1 : mmDifficulty === 'normal' ? 2 : 5;
                setTimeout(async () => {
                    alert(`🎉 YOU WON in ${mmMoves} moves! (+${pts} Points)`);
                    await addPointsToUser('memoryMatch', pts);
                    document.getElementById('mm-quit-btn').click();
                }, 300);
            }
        } else {
            // Not a match, unflip after delay
            setTimeout(() => {
                card1.dataset.flipped = 'false';
                card1.innerText = '';
                card1.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
                
                card2.dataset.flipped = 'false';
                card2.innerText = '';
                card2.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
                
                mmFlippedCards = [];
                mmIsLocked = false;
            }, 800);
        }
    }
}
