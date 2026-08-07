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
const backToHubBtn = document.getElementById('back-to-hub');

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
        loadLeaderboard(lbGameSelect.value); // Load ranks when clicked
    });
}

if(lbGameSelect) {
    lbGameSelect.addEventListener('change', () => loadLeaderboard(lbGameSelect.value));
}

// Open Game from Hub
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
// LEADERBOARD LOGIC
// ==========================================
async function loadLeaderboard(gameName) {
    const listDiv = document.getElementById('leaderboard-list');
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Top Players...</div>';
    
    try {
        const snap = await get(child(ref(db), 'users'));
        if(snap.exists()) {
            let players = [];
            snap.forEach(childSnap => {
                let data = childSnap.val();
                let pts = data.gamePoints && data.gamePoints[gameName] ? data.gamePoints[gameName] : 0;
                if(pts > 0) {
                    players.push({
                        username: data.username || 'unknown',
                        photo: data.profilePhoto || 'default-profile.png',
                        points: pts
                    });
                }
            });
            
            // Sort Descending & Get Top 10
            players.sort((a, b) => b.points - a.points);
            players = players.slice(0, 10);
            
            if(players.length === 0) {
                listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">No one has points yet! Be the first!</div>';
                return;
            }
            
            listDiv.innerHTML = '';
            players.forEach((p, index) => {
                let rankColors = ['#ffd700', '#c0c0c0', '#cd7f32']; // Gold, Silver, Bronze
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
        console.log(err);
        listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#ff4757;">Error loading leaderboard</div>';
    }
}

// ==========================================
// CODE GUESS GAME LOGIC & POINTS SYSTEM
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
let maxGuesses = 0;
let guessesLeft = 0;
let codeLength = 0;
let allowedColorsCount = 0;
let currentDifficulty = '';

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
    currentDifficulty = document.getElementById('cg-difficulty').value;
    
    if (currentDifficulty === 'easy') { codeLength = 4; maxGuesses = 7; allowedColorsCount = 5; }
    else if (currentDifficulty === 'normal') { codeLength = 5; maxGuesses = 12; allowedColorsCount = 6; }
    else if (currentDifficulty === 'hard') { codeLength = 6; maxGuesses = 15; allowedColorsCount = 8; }
    
    guessesLeft = maxGuesses;
    currentGuess = [];
    secretCode = [];
    
    for (let i = 0; i < codeLength; i++) {
        secretCode.push(allColorsKeys[Math.floor(Math.random() * allowedColorsCount)]);
    }
    
    cgSetup.style.display = 'none';
    cgGameArea.style.display = 'block';
    cgGuessesLeftTxt.innerText = guessesLeft;
    cgHistory.innerHTML = ''; 
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
        let btn = document.createElement('div');
        btn.style.width = '30px'; btn.style.height = '30px'; btn.style.borderRadius = '50%';
        btn.style.backgroundColor = colorMap[colorKey].hex; btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)'; btn.style.border = '2px solid rgba(255,255,255,0.2)';
        
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
    for (let i = 0; i < codeLength; i++) {
        let slot = document.createElement('div');
        slot.style.width = '25px'; slot.style.height = '25px'; slot.style.borderRadius = '50%';
        slot.style.border = '2px dashed rgba(255,255,255,0.3)';
        if (currentGuess[i]) {
            slot.style.backgroundColor = colorMap[currentGuess[i]].hex;
            slot.style.border = '2px solid white';
        }
        cgCurrentGuessBox.appendChild(slot);
    }
}

function clearGuess() { currentGuess = []; updateCurrentGuessUI(); }

async function submitGuess() {
    if (currentGuess.length < codeLength) { alert(`Please select ${codeLength} colors!`); return; }
    
    let exactMatches = 0; let colorMatches = 0;
    let tempSecret = [...secretCode]; let tempGuess = [...currentGuess];
    
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] === tempSecret[i]) {
            exactMatches++; tempSecret[i] = null; tempGuess[i] = null;
        }
    }
    for (let i = 0; i < codeLength; i++) {
        if (tempGuess[i] !== null) {
            let foundIndex = tempSecret.indexOf(tempGuess[i]);
            if (foundIndex !== -1) { colorMatches++; tempSecret[foundIndex] = null; }
        }
    }
    
    addHistoryRow(currentGuess, exactMatches, colorMatches);
    guessesLeft--; cgGuessesLeftTxt.innerText = guessesLeft;
    
    if (exactMatches === codeLength) {
        let pts = currentDifficulty === 'easy' ? 1 : currentDifficulty === 'normal' ? 2 : 5;
        alert(`🎉 YOU WON! (+${pts} Points)`);
        await addPointsToUser(pts);
        quitGame();
    } else if (guessesLeft === 0) {
        alert(`❌ GAME OVER! The code was: ${secretCode.join(' ')}`);
        quitGame();
    } else { clearGuess(); }
}

async function addPointsToUser(ptsToAdd) {
    if(!auth.currentUser) return; // User must be logged in to get points
    try {
        const uid = auth.currentUser.uid;
        const ptsRef = child(ref(db), `users/${uid}/gamePoints/codeGuess`);
        const snap = await get(ptsRef);
        let currentPts = snap.exists() ? snap.val() : 0;
        await update(ref(db, `users/${uid}/gamePoints`), { codeGuess: currentPts + ptsToAdd });
    } catch(err) {
        console.error("Error adding points:", err);
    }
}

function addHistoryRow(guessArr, exact, color) {
    let row = document.createElement('div');
    row.style.background = 'rgba(255,255,255,0.1)'; row.style.padding = '8px'; row.style.borderRadius = '6px';
    row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center';
    
    let colorsDiv = document.createElement('div'); colorsDiv.style.display = 'flex'; colorsDiv.style.gap = '4px';
    guessArr.forEach(c => {
        let dot = document.createElement('div');
        dot.style.width = '15px'; dot.style.height = '15px'; dot.style.borderRadius = '50%';
        dot.style.backgroundColor = colorMap[c].hex; colorsDiv.appendChild(dot);
    });
    
    let feedbackDiv = document.createElement('div'); feedbackDiv.style.fontSize = '10px';
    feedbackDiv.innerHTML = `<span style="color:#2ecc71;">${exact} Pos</span> | <span style="color:#f1c40f;">${color} Col</span>`;
    
    row.appendChild(colorsDiv); row.appendChild(feedbackDiv);
    cgHistory.prepend(row);
}
