import { auth, db } from './firebase.js';
import { ref, get, child, update, set, onValue, remove, push, off } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// ==========================================
// 1. NAVIGATION & TABS LOGIC
// ==========================================
const mainOpenGamesBtn = document.getElementById('main-open-games-btn');
const navOpenGamesBtn = document.getElementById('nav-open-games');
const hubModal = document.getElementById('games-hub-modal');
const closeHubBtn = document.getElementById('close-games-hub');
const dropdownMenu = document.getElementById('dropdown-menu');

const tabPlayGames = document.getElementById('tab-play-games');
const tabLeaderboard = document.getElementById('tab-leaderboard');
const tabStore = document.getElementById('tab-store');
const tabPurchases = document.getElementById('tab-purchases');

const secPlayGames = document.getElementById('sec-play-games');
const secLeaderboard = document.getElementById('sec-leaderboard');
const secStore = document.getElementById('sec-store');
const secPurchases = document.getElementById('sec-purchases');

const navCoinsDisplay = document.getElementById('nav-coins-display');
const hubCoinsDisplay = document.getElementById('hub-coins-display');
const tttBalanceDisplay = document.getElementById('ttt-balance');

let myGlobalCoins = 0;
let myUsername = 'user';

async function fetchMyCoins() {
    if(!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const snap = await get(child(ref(db), `users/${uid}`));
    if(snap.exists()) {
        const data = snap.val();
        myGlobalCoins = data.coins || 0;
        myUsername = data.username || 'user';
        if (navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
        if (hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
        if (tttBalanceDisplay) tttBalanceDisplay.innerText = myGlobalCoins;
    }
}

function openHub() {
    fetchMyCoins();
    if(hubModal) hubModal.style.display = 'block';
    if(dropdownMenu) dropdownMenu.style.display = 'none';
}

if(mainOpenGamesBtn) mainOpenGamesBtn.addEventListener('click', openHub);
if(navOpenGamesBtn) navOpenGamesBtn.addEventListener('click', openHub);
if(closeHubBtn) closeHubBtn.addEventListener('click', () => hubModal.style.display = 'none');

function hideAllHubSecs() {
    if(secPlayGames) secPlayGames.style.display = 'none';
    if(secLeaderboard) secLeaderboard.style.display = 'none';
    if(secStore) secStore.style.display = 'none';
    if(secPurchases) secPurchases.style.display = 'none';
    if(tabPlayGames) tabPlayGames.style.background = '#555';
    if(tabLeaderboard) tabLeaderboard.style.background = '#555';
    if(tabStore) tabStore.style.background = '#555';
    if(tabPurchases) tabPurchases.style.background = '#555';
}

if(tabPlayGames) tabPlayGames.addEventListener('click', () => { hideAllHubSecs(); if(secPlayGames) secPlayGames.style.display = 'block'; tabPlayGames.style.background = '#9b59b6'; });
if(tabLeaderboard) tabLeaderboard.addEventListener('click', () => { hideAllHubSecs(); if(secLeaderboard) secLeaderboard.style.display = 'block'; tabLeaderboard.style.background = '#9b59b6'; loadGlobalLeaderboard(); });
if(tabStore) tabStore.addEventListener('click', () => { hideAllHubSecs(); if(secStore) secStore.style.display = 'block'; tabStore.style.background = '#9b59b6'; loadStoreItems(); });
if(tabPurchases) tabPurchases.addEventListener('click', () => { hideAllHubSecs(); if(secPurchases) secPurchases.style.display = 'block'; tabPurchases.style.background = '#9b59b6'; loadMyPurchases(); });

// ==========================================
// 2. UNIVERSAL COINS & LEADERBOARD
// ==========================================
async function addCoins(ptsToAdd) {
    if(!auth.currentUser) return;
    myGlobalCoins += ptsToAdd; 
    if (navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
    if (hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
    await update(ref(db, `users/${auth.currentUser.uid}`), { coins: myGlobalCoins });
}

async function deductCoins(ptsToDeduct) {
    if(!auth.currentUser) return false;
    if(myGlobalCoins < ptsToDeduct) { alert("Not enough coins!"); return false; }
    myGlobalCoins -= ptsToDeduct;
    if (navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
    if (hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
    await update(ref(db, `users/${auth.currentUser.uid}`), { coins: myGlobalCoins });
    return true;
}

async function loadGlobalLeaderboard() {
    const listDiv = document.getElementById('leaderboard-list');
    if(!listDiv) return;
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Top Richest...</div>';
    try {
        const snap = await get(child(ref(db), 'users'));
        if(snap.exists()) {
            let players = [];
            snap.forEach(childSnap => {
                let data = childSnap.val();
                let c = data.coins || 0;
                if(c > 0) players.push({ username: data.username || 'unknown', photo: data.profilePhoto || 'default-profile.png', coins: c });
            });
            players.sort((a, b) => b.coins - a.coins);
            players = players.slice(0, 10);
            
            listDiv.innerHTML = '';
            players.forEach((p, index) => {
                let rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#aaa';
                let rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`;
                listDiv.innerHTML += `
                    <div style="display:flex; align-items:center; background:rgba(255,255,255,0.1); padding:8px 10px; border-radius:10px; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:14px; font-weight:bold; color:${rankColor}; width:25px; text-align:center;">${rankEmoji}</span>
                            <img src="${p.photo}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid ${rankColor};">
                            <span style="font-size:13px; font-weight:bold; color:white;">@${p.username}</span>
                        </div>
                        <span style="font-size:12px; font-weight:bold; color:#ffd700;">${p.coins} 🪙</span>
                    </div>`;
            });
        }
    } catch(err) { listDiv.innerHTML = '<div style="color:#ff4757;">Error loading leaderboard</div>'; }
}

// ==========================================
// 3. STORE & INVENTORY SYSTEM
// ==========================================
async function loadStoreItems() {
    const listDiv = document.getElementById('store-items-list');
    if(!listDiv) return;
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Offers...</div>';
    try {
        const snap = await get(child(ref(db), 'store'));
        listDiv.innerHTML = '';
        if(snap.exists()) {
            snap.forEach(childSnap => {
                let item = childSnap.val();
                let itemId = childSnap.key;
                if(item.isActive) {
                    listDiv.innerHTML += `
                        <div style="background:rgba(255,255,255,0.1); padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.2);">
                            <h4 style="margin:0; color:#1db954; font-size:14px;">${item.offerName}</h4>
                            <p style="font-size:11px; color:#ddd; margin:5px 0;">${item.offerDesc}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                                <span style="font-weight:bold; color:#ffd700; font-size:14px;">${item.price} 🪙</span>
                                <button onclick="buyStoreItem('${itemId}', ${item.price})" style="background:#1e90ff; padding:5px 12px; font-size:11px; margin:0; width:auto;">Buy Now</button>
                            </div>
                        </div>`;
                }
            });
        } else {
            listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Store is empty right now.</div>';
        }
    } catch(err) { listDiv.innerHTML = '<div style="color:#ff4757;">Error loading store</div>'; }
}

window.buyStoreItem = async function(itemId, price) {
    if(!auth.currentUser) return alert("Please Login!");
    if(myGlobalCoins < price) return alert("You don't have enough coins!");
    if(!confirm(`Buy this offer for ${price} Coins?`)) return;

    try {
        const uid = auth.currentUser.uid;
        const itemSnap = await get(ref(db, `store/${itemId}`));
        if(!itemSnap.exists() || !itemSnap.val().isActive) return alert("Offer expired!");
        const itemData = itemSnap.val();

        await deductCoins(price);

        const purchaseRef = push(ref(db, `users/${uid}/purchases`));
        await set(purchaseRef, {
            offerName: itemData.offerName,
            offerDesc: itemData.offerDesc,
            secretCode: itemData.secretCode, 
            timestamp: Date.now()
        });

        alert("Purchase Successful! Check 'My Items'.");
        if(tabPurchases) tabPurchases.click();
    } catch(err) {
        alert("Transaction Failed!");
    }
}

async function loadMyPurchases() {
    const listDiv = document.getElementById('my-purchases-list');
    if(!listDiv || !auth.currentUser) return;
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Items...</div>';
    try {
        const uid = auth.currentUser.uid;
        const snap = await get(child(ref(db), `users/${uid}/purchases`));
        listDiv.innerHTML = '';
        if(snap.exists()) {
            snap.forEach(childSnap => {
                let p = childSnap.val();
                let date = new Date(p.timestamp).toLocaleDateString();
                listDiv.innerHTML += `
                    <div style="background:rgba(0,0,0,0.5); padding:12px; border-radius:10px; border:1px dashed #e67e22;">
                        <h4 style="margin:0; color:#e67e22; font-size:14px;">${p.offerName}</h4>
                        <p style="font-size:10px; color:#aaa; margin:3px 0;">Purchased on: ${date}</p>
                        <p style="font-size:11px; color:#ddd; margin:5px 0;">${p.offerDesc}</p>
                        <div style="background:#222; padding:8px; border-radius:6px; text-align:center; margin-top:8px;">
                            <span style="font-size:10px; color:#aaa;">YOUR SECRET CODE:</span><br>
                            <span style="font-weight:bold; color:#1db954; font-size:16px; letter-spacing:1px;">${p.secretCode}</span>
                        </div>
                    </div>`;
            });
        } else {
            listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">You haven\'t bought anything yet.</div>';
        }
    } catch(err) { listDiv.innerHTML = '<div style="color:#ff4757;">Error loading purchases</div>'; }
}

// ==========================================
// 4. TIC-TAC-TOE (O X) MULTIPLAYER LOGIC
// ==========================================
const openTTTBtn = document.getElementById('btn-open-tic-tac-toe');
const tttModal = document.getElementById('tic-tac-toe-modal');
const backToHubTTTBtn = document.getElementById('back-to-hub-ttt');

const tttSetup = document.getElementById('ttt-setup');
const tttMatchmaking = document.getElementById('ttt-matchmaking');
const tttGameArea = document.getElementById('ttt-game-area');
const tttBetInput = document.getElementById('ttt-bet-amount');

let currentMatchId = null;
let activeMatchListener = null;
let isHost = false;
let mySymbol = '';
let currentBet = 0;

if(openTTTBtn) openTTTBtn.addEventListener('click', () => { if(hubModal) hubModal.style.display = 'none'; if(tttModal) tttModal.style.display = 'block'; fetchMyCoins(); });
if(backToHubTTTBtn) backToHubTTTBtn.addEventListener('click', () => { if(tttModal) tttModal.style.display = 'none'; if(hubModal) hubModal.style.display = 'block'; });

const tttRandomBtn = document.getElementById('ttt-random-btn');
if(tttRandomBtn) {
    tttRandomBtn.addEventListener('click', async () => {
        let bet = parseInt(tttBetInput.value) || 0;
        if (bet < 0) return alert("Invalid bet.");
        if (myGlobalCoins < bet) return alert("Not enough coins to bet!");
        
        currentBet = bet;
        tttSetup.style.display = 'none'; tttMatchmaking.style.display = 'block';
        document.getElementById('ttt-mm-status').innerText = "Searching for a player...";
        
        const snap = await get(ref(db, 'ttt_matches'));
        let foundMatch = null;
        if(snap.exists()) {
            snap.forEach(c => {
                let match = c.val();
                if(match.status === 'waiting' && match.type === 'random' && match.bet === bet) foundMatch = c.key;
            });
        }

        if (foundMatch) {
            isHost = false;
            await deductCoins(bet);
            await update(ref(db, `ttt_matches/${foundMatch}`), { player2: auth.currentUser.uid, p2Name: myUsername, status: 'playing' });
            listenToMatch(foundMatch);
        } else {
            isHost = true;
            await deductCoins(bet);
            let newMatchRef = push(ref(db, 'ttt_matches'));
            currentMatchId = newMatchRef.key;
            
            let hostSymbol = Math.random() > 0.5 ? 'X' : 'O';
            await set(newMatchRef, {
                player1: auth.currentUser.uid, p1Name: myUsername,
                player2: null, p2Name: 'Waiting...',
                bet: bet, type: 'random', status: 'waiting',
                board: ['', '', '', '', '', '', '', '', ''],
                turn: 'X', hostSymbol: hostSymbol, winner: null
            });
            listenToMatch(currentMatchId);

            setTimeout(async () => {
                let checkSnap = await get(ref(db, `ttt_matches/${currentMatchId}`));
                if(checkSnap.exists()) {
                    let matchData = checkSnap.val();
                    if(matchData.status === 'waiting' && !matchData.player2) {
                        let botNames = ['Bot Rahul', 'Bot Priya', 'Bot Aman'];
                        let bName = botNames[Math.floor(Math.random() * botNames.length)];
                        await update(ref(db, `ttt_matches/${currentMatchId}`), { player2: 'BOT', p2Name: bName, status: 'playing' });
                    }
                }
            }, 5000);
        }
    });
}

const tttCreateBtn = document.getElementById('ttt-create-btn');
if(tttCreateBtn) {
    tttCreateBtn.addEventListener('click', async () => {
        let bet = parseInt(tttBetInput.value) || 0;
        if (myGlobalCoins < bet) return alert("Not enough coins!");
        currentBet = bet; isHost = true;
        await deductCoins(bet);
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        currentMatchId = code;
        
        let hostSymbol = Math.random() > 0.5 ? 'X' : 'O';
        await set(ref(db, `ttt_matches/${code}`), {
            player1: auth.currentUser.uid, p1Name: myUsername, player2: null, p2Name: 'Waiting...',
            bet: bet, type: 'friend', status: 'waiting', board: ['', '', '', '', '', '', '', '', ''], turn: 'X', hostSymbol: hostSymbol, winner: null
        });
        
        tttSetup.style.display = 'none'; tttMatchmaking.style.display = 'block';
        document.getElementById('ttt-mm-status').innerText = "Waiting for friend...";
        document.getElementById('ttt-room-code-display').innerHTML = `Code: <strong style="color:white; font-size:18px;">${code}</strong>`;
        listenToMatch(code);
    });
}

const tttJoinBtn = document.getElementById('ttt-join-btn');
if(tttJoinBtn) {
    tttJoinBtn.addEventListener('click', async () => {
        let code = prompt("Enter 4-digit Room Code:");
        if(!code) return;
        
        const snap = await get(ref(db, `ttt_matches/${code}`));
        if(!snap.exists() || snap.val().status !== 'waiting') return alert("Room not found/full!");
        
        let bet = snap.val().bet;
        if(myGlobalCoins < bet) return alert(`You need ${bet} coins!`);
        
        currentBet = bet; isHost = false;
        await deductCoins(bet);
        await update(ref(db, `ttt_matches/${code}`), { player2: auth.currentUser.uid, p2Name: myUsername, status: 'playing' });
        listenToMatch(code);
    });
}

const tttCancelBtn = document.getElementById('ttt-cancel-mm-btn');
if(tttCancelBtn) {
    tttCancelBtn.addEventListener('click', async () => {
        if(currentMatchId && isHost) {
            await addCoins(currentBet);
            await remove(ref(db, `ttt_matches/${currentMatchId}`));
        }
        if (activeMatchListener) off(ref(db, `ttt_matches/${currentMatchId}`));
        tttMatchmaking.style.display = 'none'; tttSetup.style.display = 'block';
    });
}

const tttLeaveBtn = document.getElementById('ttt-leave-game-btn');
if(tttLeaveBtn) {
    tttLeaveBtn.addEventListener('click', async () => {
        if(!confirm("Are you sure? You lose your bet coins!")) return;
        if(currentMatchId) {
            let winner = isHost ? 'O' : 'X';
            await update(ref(db, `ttt_matches/${currentMatchId}`), { winner: winner, status: 'finished' });
        }
    });
}

function listenToMatch(matchId) {
    currentMatchId = matchId;
    if(activeMatchListener) activeMatchListener();
    
    activeMatchListener = onValue(ref(db, `ttt_matches/${matchId}`), async (snap) => {
        if(!snap.exists()) {
            tttMatchmaking.style.display = 'none'; tttGameArea.style.display = 'none'; tttSetup.style.display = 'block';
            return;
        }
        let match = snap.val();
        if(match.status === 'playing' || match.status === 'finished') {
            tttMatchmaking.style.display = 'none'; tttGameArea.style.display = 'block';
            
            mySymbol = isHost ? match.hostSymbol : (match.hostSymbol === 'X' ? 'O' : 'X');
            let p1Sym = match.hostSymbol;
            
            document.getElementById('ttt-player-x').innerText = (p1Sym === 'X') ? match.p1Name : match.p2Name;
            document.getElementById('ttt-player-o').innerText = (p1Sym === 'O') ? match.p1Name : match.p2Name;
            document.getElementById('ttt-current-bet').innerText = match.bet;
            
            let cells = document.querySelectorAll('.ttt-cell');
            cells.forEach((cell, i) => {
                cell.innerText = match.board[i];
                cell.className = 'ttt-cell ' + (match.board[i] === 'X' ? 'x' : match.board[i] === 'O' ? 'o' : '');
            });
            
            document.getElementById('ttt-turn-display').innerText = (match.turn === mySymbol) ? "🟩 YOUR TURN!" : "🟥 Opponent's Turn...";
            
            if (isHost && match.player2 === 'BOT' && match.turn !== mySymbol && match.status === 'playing') {
                setTimeout(() => playBotMove(match), 800);
            }

            if(match.status === 'finished') {
                if(activeMatchListener) activeMatchListener();
                setTimeout(async () => {
                    if(match.winner === 'Draw') {
                        alert("DRAW! Coins refunded.");
                        await addCoins(match.bet);
                    } else if (match.winner === mySymbol) {
                        alert(`🎉 YOU WON! (+${match.bet * 2} Coins)`);
                        await addCoins(match.bet * 2);
                    } else {
                        alert(`❌ YOU LOST!`);
                    }
                    tttGameArea.style.display = 'none'; tttSetup.style.display = 'block';
                    fetchMyCoins();
                }, 500);
            }
        }
    });
}

document.querySelectorAll('.ttt-cell').forEach(cell => {
    cell.addEventListener('click', async (e) => {
        let index = e.target.getAttribute('data-index');
        let snap = await get(ref(db, `ttt_matches/${currentMatchId}`));
        if(!snap.exists()) return;
        let match = snap.val();
        if(match.status !== 'playing' || match.turn !== mySymbol || match.board[index] !== '') return;
        
        let newBoard = [...match.board];
        newBoard[index] = mySymbol;
        let nextTurn = (mySymbol === 'X') ? 'O' : 'X';
        let winner = checkTTTWin(newBoard);
        
        let updates = { board: newBoard, turn: nextTurn };
        if(winner) { updates.status = 'finished'; updates.winner = winner; }
        await update(ref(db, `ttt_matches/${currentMatchId}`), updates);
    });
});

function checkTTTWin(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let w of wins) { if(b[w[0]] && b[w[0]] === b[w[1]] && b[w[0]] === b[w[2]]) return b[w[0]]; }
    if(!b.includes('')) return 'Draw';
    return null;
}

async function playBotMove(match) {
    let board = [...match.board];
    let botSym = (match.hostSymbol === 'X') ? 'O' : 'X';
    let humanSym = match.hostSymbol;
    let bestScore = -Infinity; let bestMove = -1;
    
    for(let i=0; i<9; i++) {
        if(board[i] === '') {
            board[i] = botSym;
            let score = minimax(board, 0, false, botSym, humanSym);
            board[i] = '';
            if(score > bestScore) { bestScore = score; bestMove = i; }
        }
    }
    
    if(bestMove !== -1) {
        board[bestMove] = botSym;
        let winner = checkTTTWin(board);
        let updates = { board: board, turn: humanSym };
        if(winner) { updates.status = 'finished'; updates.winner = winner; }
        await update(ref(db, `ttt_matches/${currentMatchId}`), updates);
    }
}

function minimax(board, depth, isMax, botSym, humanSym) {
    let result = checkTTTWin(board);
    if(result === botSym) return 10 - depth;
    if(result === humanSym) return depth - 10;
    if(result === 'Draw') return 0;
    
    if(isMax) {
        let best = -Infinity;
        for(let i=0; i<9; i++) {
            if(board[i] === '') { board[i] = botSym; best = Math.max(minimax(board, depth+1, false, botSym, humanSym), best); board[i] = ''; }
        }
        return best;
    } else {
        let best = Infinity;
        for(let i=0; i<9; i++) {
            if(board[i] === '') { board[i] = humanSym; best = Math.min(minimax(board, depth+1, true, botSym, humanSym), best); board[i] = ''; }
        }
        return best;
    }
}

// ==========================================
// 5. CODE GUESS GAME LOGIC
// ==========================================
const openCGBtn = document.getElementById('btn-open-code-guess');
const cgModal = document.getElementById('code-guess-modal');
const backToHubCGBtn = document.getElementById('back-to-hub-cg');

const colorMap = {
    'Y': { hex: '#f1c40f' }, 'O': { hex: '#e67e22' }, 'W': { hex: '#ffffff' }, 'G': { hex: '#2ecc71' },
    'R': { hex: '#e74c3c' }, 'B': { hex: '#3498db' }, 'P': { hex: '#9b59b6' }, 'K': { hex: '#ff9ff3' }
};
const allColorsKeys = ['Y', 'O', 'W', 'G', 'R', 'B', 'P', 'K'];
let secretCode = []; let currentGuess = [];
let maxGuesses = 0; let guessesLeft = 0; let codeLength = 0; let allowedColorsCount = 0; let cgDifficulty = '';

const cgSetup = document.getElementById('cg-setup');
const cgGameArea = document.getElementById('cg-game-area');
const cgGuessesLeftTxt = document.getElementById('cg-guesses-left');
const cgColorPicker = document.getElementById('cg-color-picker');
const cgCurrentGuessBox = document.getElementById('cg-current-guess');
const cgHistory = document.getElementById('cg-history');

if (openCGBtn) { openCGBtn.addEventListener('click', () => { if(hubModal) hubModal.style.display = 'none'; if(cgModal) cgModal.style.display = 'block'; }); }
if (backToHubCGBtn) { backToHubCGBtn.addEventListener('click', () => { if(cgModal) cgModal.style.display = 'none'; if(hubModal) hubModal.style.display = 'block'; }); }

const cgStartBtn = document.getElementById('cg-start-btn');
if(cgStartBtn) {
    cgStartBtn.addEventListener('click', () => {
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
}

const cgQuitBtn = document.getElementById('cg-quit-btn');
if(cgQuitBtn) cgQuitBtn.addEventListener('click', () => { cgGameArea.style.display = 'none'; cgSetup.style.display = 'block'; });

const cgClearBtn = document.getElementById('cg-clear-btn');
if(cgClearBtn) cgClearBtn.addEventListener('click', () => { currentGuess = []; cgUpdateUI(); });

const cgSubmitBtn = document.getElementById('cg-submit-btn');
if(cgSubmitBtn) {
    cgSubmitBtn.addEventListener('click', async () => {
        if (currentGuess.length < codeLength) return alert(`Select ${codeLength} colors!`);
        
        let exact = 0; let colMatch = 0;
        let tempSec = [...secretCode]; let tempGs = [...currentGuess];
        
        for (let i=0; i<codeLength; i++) { if (tempGs[i] === tempSec[i]) { exact++; tempSec[i] = null; tempGs[i] = null; } }
        for (let i=0; i<codeLength; i++) {
            if (tempGs[i] !== null) { let idx = tempSec.indexOf(tempGs[i]); if (idx !== -1) { colMatch++; tempSec[idx] = null; } }
        }
        
        cgAddHistoryRow(currentGuess, exact, colMatch);
        guessesLeft--; cgGuessesLeftTxt.innerText = guessesLeft;
        
        if (exact === codeLength) {
            let pts = cgDifficulty === 'easy' ? 1 : cgDifficulty === 'normal' ? 2 : 5;
            alert(`🎉 YOU WON! (+${pts} Coins)`);
            await addCoins(pts);
            cgQuitBtn.click();
        } else if (guessesLeft === 0) {
            alert(`❌ GAME OVER! Code: ${secretCode.join(' ')}`);
            cgQuitBtn.click();
        } else { currentGuess = []; cgUpdateUI(); }
    });
}

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
// 6. MEMORY MATCH GAME LOGIC
// ==========================================
const openMMBtn = document.getElementById('btn-open-memory-match');
const mmModal = document.getElementById('memory-match-modal');
const backToHubMMBtn = document.getElementById('back-to-hub-mm');

const mmEmojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝', '🥥', '🍑'];
let mmFlippedCards = []; let mmMatchedPairs = 0; let mmTotalPairs = 0; let mmMoves = 0; let mmIsLocked = false; let mmDifficulty = '';

const mmSetup = document.getElementById('mm-setup');
const mmGameArea = document.getElementById('mm-game-area');
const mmGrid = document.getElementById('mm-grid');
const mmMovesTxt = document.getElementById('mm-moves-txt');

if (openMMBtn) { openMMBtn.addEventListener('click', () => { if(hubModal) hubModal.style.display = 'none'; if(mmModal) mmModal.style.display = 'block'; }); }
if (backToHubMMBtn) { backToHubMMBtn.addEventListener('click', () => { if(mmModal) mmModal.style.display = 'none'; if(hubModal) hubModal.style.display = 'block'; }); }

const mmStartBtn = document.getElementById('mm-start-btn');
if(mmStartBtn) {
    mmStartBtn.addEventListener('click', () => {
        mmDifficulty = document.getElementById('mm-difficulty').value;
        if (mmDifficulty === 'easy') { mmTotalPairs = 6; } else if (mmDifficulty === 'normal') { mmTotalPairs = 8; } else if (mmDifficulty === 'hard') { mmTotalPairs = 10; }
        
        mmMoves = 0; mmMatchedPairs = 0; mmFlippedCards = []; mmIsLocked = false; mmMovesTxt.innerText = mmMoves;
        
        let deck = [];
        for (let i = 0; i < mmTotalPairs; i++) { deck.push(mmEmojis[i], mmEmojis[i]); }
        deck.sort(() => 0.5 - Math.random());
        
        mmGrid.innerHTML = '';
        deck.forEach((emoji, index) => {
            let card = document.createElement('div');
            card.style.height = '60px'; card.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
            card.style.border = '1px solid rgba(255,255,255,0.2)'; card.style.borderRadius = '8px';
            card.style.display = 'flex'; card.style.justifyContent = 'center'; card.style.alignItems = 'center';
            card.style.fontSize = '26px'; card.style.cursor = 'pointer'; card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
            
            card.dataset.emoji = emoji; card.dataset.flipped = 'false';
            card.addEventListener('click', () => handleCardClick(card));
            mmGrid.appendChild(card);
        });
        
        mmSetup.style.display = 'none'; mmGameArea.style.display = 'block';
    });
}

const mmQuitBtn = document.getElementById('mm-quit-btn');
if(mmQuitBtn) mmQuitBtn.addEventListener('click', () => { mmGameArea.style.display = 'none'; mmSetup.style.display = 'block'; });

async function handleCardClick(card) {
    if (mmIsLocked || card.dataset.flipped === 'true' || mmFlippedCards.length >= 2) return;
    
    card.dataset.flipped = 'true'; card.innerText = card.dataset.emoji; card.style.background = 'rgba(255,255,255,0.2)';
    mmFlippedCards.push(card);
    
    if (mmFlippedCards.length === 2) {
        mmMoves++; mmMovesTxt.innerText = mmMoves; mmIsLocked = true;
        let c1 = mmFlippedCards[0]; let c2 = mmFlippedCards[1];
        
        if (c1.dataset.emoji === c2.dataset.emoji) {
            c1.style.background = 'rgba(46, 204, 113, 0.4)'; c2.style.background = 'rgba(46, 204, 113, 0.4)';
            mmMatchedPairs++; mmFlippedCards = []; mmIsLocked = false;
            
            if (mmMatchedPairs === mmTotalPairs) {
                let pts = mmDifficulty === 'easy' ? 1 : mmDifficulty === 'normal' ? 2 : 5;
                setTimeout(async () => {
                    alert(`🎉 YOU WON in ${mmMoves} moves! (+${pts} Coins)`);
                    await addCoins(pts);
                    mmQuitBtn.click();
                }, 300);
            }
        } else {
            setTimeout(() => {
                c1.dataset.flipped = 'false'; c1.innerText = ''; c1.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
                c2.dataset.flipped = 'false'; c2.innerText = ''; c2.style.background = 'linear-gradient(135deg, #1e90ff, #0056b3)';
                mmFlippedCards = []; mmIsLocked = false;
            }, 800);
        }
    }
}
