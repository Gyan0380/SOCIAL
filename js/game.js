import { auth, db } from './firebase.js';
import { ref, get, child, update, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js"; // Note: Use correct firebase DB import
import { ref as dbRef, get as dbGet, child as dbChild, update as dbUpdate, set as dbSet, onValue as dbOnValue, remove as dbRemove, push as dbPush } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// --- Navigation Logic ---
const mainOpenGamesBtn = document.getElementById('main-open-games-btn');
const navOpenGamesBtn = document.getElementById('nav-open-games');
const hubModal = document.getElementById('games-hub-modal');
const closeHubBtn = document.getElementById('close-games-hub');
const dropdownMenu = document.getElementById('dropdown-menu');

const tabPlayGames = document.getElementById('tab-play-games');
const tabLeaderboard = document.getElementById('tab-leaderboard');
const secPlayGames = document.getElementById('sec-play-games');
const secLeaderboard = document.getElementById('sec-leaderboard');

const navCoinsDisplay = document.getElementById('nav-coins-display');
const hubCoinsDisplay = document.getElementById('hub-coins-display');
const tttBalanceDisplay = document.getElementById('ttt-balance');

let myGlobalCoins = 0;
let myUsername = 'user';

async function fetchMyCoins() {
    if(!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const snap = await dbGet(dbChild(dbRef(db), `users/${uid}`));
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
    hubModal.style.display = 'block';
    if(dropdownMenu) dropdownMenu.style.display = 'none';
}

if(mainOpenGamesBtn) mainOpenGamesBtn.addEventListener('click', openHub);
if(navOpenGamesBtn) navOpenGamesBtn.addEventListener('click', openHub);
if(closeHubBtn) closeHubBtn.addEventListener('click', () => hubModal.style.display = 'none');

if(tabPlayGames) {
    tabPlayGames.addEventListener('click', () => {
        secPlayGames.style.display = 'block'; secLeaderboard.style.display = 'none';
        tabPlayGames.style.background = '#9b59b6'; tabLeaderboard.style.background = '#555';
    });
}

if(tabLeaderboard) {
    tabLeaderboard.addEventListener('click', () => {
        secPlayGames.style.display = 'none'; secLeaderboard.style.display = 'block';
        tabLeaderboard.style.background = '#9b59b6'; tabPlayGames.style.background = '#555';
        loadGlobalLeaderboard();
    });
}

// ==========================================
// UNIVERSAL COINS & LEADERBOARD SYSTEM
// ==========================================
async function addCoins(ptsToAdd) {
    if(!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    myGlobalCoins += ptsToAdd; // Local update
    if (navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
    if (hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
    await dbUpdate(dbRef(db, `users/${uid}`), { coins: myGlobalCoins });
}

async function deductCoins(ptsToDeduct) {
    if(!auth.currentUser) return false;
    if(myGlobalCoins < ptsToDeduct) {
        alert("Not enough coins! Earn free coins playing Code Guess or Memory Match.");
        return false;
    }
    myGlobalCoins -= ptsToDeduct;
    if (navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
    if (hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
    await dbUpdate(dbRef(db, `users/${auth.currentUser.uid}`), { coins: myGlobalCoins });
    return true;
}

async function loadGlobalLeaderboard() {
    const listDiv = document.getElementById('leaderboard-list');
    listDiv.innerHTML = '<div style="text-align:center; font-size:12px; color:#aaa;">Loading Top Richest...</div>';
    try {
        const snap = await dbGet(dbChild(dbRef(db), 'users'));
        if(snap.exists()) {
            let players = [];
            snap.forEach(childSnap => {
                let data = childSnap.val();
                let c = data.coins || 0;
                if(c > 0) players.push({ username: data.username || 'unknown', photo: data.profilePhoto || 'default-profile.png', coins: c });
            });
            
            players.sort((a, b) => b.coins - a.coins);
            players = players.slice(0, 10); // Top 10
            
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
// ❌⭕ MULTIPLAYER TIC-TAC-TOE (O X) LOGIC
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

if(openTTTBtn) {
    openTTTBtn.addEventListener('click', () => {
        hubModal.style.display = 'none'; tttModal.style.display = 'block'; fetchMyCoins();
    });
}
if(backToHubTTTBtn) {
    backToHubTTTBtn.addEventListener('click', () => {
        tttModal.style.display = 'none'; hubModal.style.display = 'block';
    });
}

// 1. Play Random (Matchmaking or Bot)
document.getElementById('ttt-random-btn').addEventListener('click', async () => {
    let bet = parseInt(tttBetInput.value) || 0;
    if (bet < 0) return alert("Invalid bet.");
    if (myGlobalCoins < bet) return alert("Not enough coins to bet!");
    
    currentBet = bet;
    tttSetup.style.display = 'none'; tttMatchmaking.style.display = 'block';
    document.getElementById('ttt-mm-status').innerText = "Searching for a player...";
    
    // Search open matches
    const snap = await dbGet(dbRef(db, 'ttt_matches'));
    let foundMatch = null;
    if(snap.exists()) {
        snap.forEach(child => {
            let match = child.val();
            if(match.status === 'waiting' && match.type === 'random' && match.bet === bet) {
                foundMatch = child.key;
            }
        });
    }

    if (foundMatch) {
        // Join Match
        isHost = false;
        await deductCoins(bet);
        await dbUpdate(dbRef(db, `ttt_matches/${foundMatch}`), { player2: auth.currentUser.uid, p2Name: myUsername, status: 'playing' });
        listenToMatch(foundMatch);
    } else {
        // Create Match & Wait 5s for human, else spawn BOT
        isHost = true;
        await deductCoins(bet);
        let newMatchRef = dbPush(dbRef(db, 'ttt_matches'));
        currentMatchId = newMatchRef.key;
        
        let hostSymbol = Math.random() > 0.5 ? 'X' : 'O'; // Randomize first turn symbol
        
        await dbSet(newMatchRef, {
            player1: auth.currentUser.uid, p1Name: myUsername,
            player2: null, p2Name: 'Waiting...',
            bet: bet, type: 'random', status: 'waiting',
            board: ['', '', '', '', '', '', '', '', ''],
            turn: 'X', hostSymbol: hostSymbol,
            winner: null
        });

        listenToMatch(currentMatchId);

        // 5-Second Bot Spawn Logic
        setTimeout(async () => {
            let checkSnap = await dbGet(dbRef(db, `ttt_matches/${currentMatchId}`));
            if(checkSnap.exists()) {
                let matchData = checkSnap.val();
                if(matchData.status === 'waiting' && !matchData.player2) {
                    // Spawn Bot
                    let botNames = ['Bot Rahul', 'Bot Priya', 'Bot Aman', 'Bot Sneha'];
                    let bName = botNames[Math.floor(Math.random() * botNames.length)];
                    await dbUpdate(dbRef(db, `ttt_matches/${currentMatchId}`), { player2: 'BOT', p2Name: bName, status: 'playing' });
                }
            }
        }, 5000);
    }
});

// Create Room for Friend
document.getElementById('ttt-create-btn').addEventListener('click', async () => {
    let bet = parseInt(tttBetInput.value) || 0;
    if (myGlobalCoins < bet) return alert("Not enough coins!");
    currentBet = bet; isHost = true;
    
    await deductCoins(bet);
    let code = Math.floor(1000 + Math.random() * 9000).toString();
    currentMatchId = code;
    
    let hostSymbol = Math.random() > 0.5 ? 'X' : 'O';
    await dbSet(dbRef(db, `ttt_matches/${code}`), {
        player1: auth.currentUser.uid, p1Name: myUsername, player2: null, p2Name: 'Waiting...',
        bet: bet, type: 'friend', status: 'waiting', board: ['', '', '', '', '', '', '', '', ''], turn: 'X', hostSymbol: hostSymbol, winner: null
    });
    
    tttSetup.style.display = 'none'; tttMatchmaking.style.display = 'block';
    document.getElementById('ttt-mm-status').innerText = "Waiting for friend...";
    document.getElementById('ttt-room-code-display').innerHTML = `Tell friend to join code: <strong style="color:white; font-size:18px;">${code}</strong>`;
    listenToMatch(code);
});

// Join Room for Friend
document.getElementById('ttt-join-btn').addEventListener('click', async () => {
    let code = prompt("Enter 4-digit Room Code:");
    if(!code) return;
    
    const snap = await dbGet(dbRef(db, `ttt_matches/${code}`));
    if(!snap.exists() || snap.val().status !== 'waiting') return alert("Room not found or already full!");
    
    let bet = snap.val().bet;
    if(myGlobalCoins < bet) return alert(`You need ${bet} coins to join this room!`);
    
    currentBet = bet; isHost = false;
    await deductCoins(bet);
    await dbUpdate(dbRef(db, `ttt_matches/${code}`), { player2: auth.currentUser.uid, p2Name: myUsername, status: 'playing' });
    listenToMatch(code);
});

// Cancel Matchmaking
document.getElementById('ttt-cancel-mm-btn').addEventListener('click', async () => {
    if(currentMatchId && isHost) {
        await addCoins(currentBet); // refund
        await dbRemove(dbRef(db, `ttt_matches/${currentMatchId}`));
    }
    if (activeMatchListener) dbOff(dbRef(db, `ttt_matches/${currentMatchId}`));
    tttMatchmaking.style.display = 'none'; tttSetup.style.display = 'block';
});

// Leave Game during play (Forfeit)
document.getElementById('ttt-leave-game-btn').addEventListener('click', async () => {
    if(!confirm("Are you sure? You will lose your bet coins!")) return;
    if(currentMatchId) {
        let winner = isHost ? 'O' : 'X'; // Other person wins
        await dbUpdate(dbRef(db, `ttt_matches/${currentMatchId}`), { winner: winner, status: 'finished' });
    }
});


// 2. Gameplay Sync Logic
function listenToMatch(matchId) {
    currentMatchId = matchId;
    if(activeMatchListener) activeMatchListener(); // unsubscribe previous
    
    activeMatchListener = dbOnValue(dbRef(db, `ttt_matches/${matchId}`), async (snap) => {
        if(!snap.exists()) {
            tttMatchmaking.style.display = 'none'; tttGameArea.style.display = 'none'; tttSetup.style.display = 'block';
            return;
        }
        
        let match = snap.val();
        
        if(match.status === 'playing' || match.status === 'finished') {
            tttMatchmaking.style.display = 'none'; tttGameArea.style.display = 'block';
            
            mySymbol = isHost ? match.hostSymbol : (match.hostSymbol === 'X' ? 'O' : 'X');
            let p1Sym = match.hostSymbol; let p2Sym = (p1Sym === 'X') ? 'O' : 'X';
            
            document.getElementById('ttt-player-x').innerText = (p1Sym === 'X') ? match.p1Name : match.p2Name;
            document.getElementById('ttt-player-o').innerText = (p1Sym === 'O') ? match.p1Name : match.p2Name;
            document.getElementById('ttt-current-bet').innerText = match.bet;
            
            // Draw Board
            let cells = document.querySelectorAll('.ttt-cell');
            cells.forEach((cell, i) => {
                cell.innerText = match.board[i];
                cell.className = 'ttt-cell ' + (match.board[i] === 'X' ? 'x' : match.board[i] === 'O' ? 'o' : '');
            });
            
            // Turn Logic
            let turnText = (match.turn === mySymbol) ? "🟩 YOUR TURN!" : "🟥 Opponent's Turn...";
            document.getElementById('ttt-turn-display').innerText = turnText;
            
            // Bot Move Check (Only Host runs Bot logic)
            if (isHost && match.player2 === 'BOT' && match.turn !== mySymbol && match.status === 'playing') {
                setTimeout(() => playBotMove(match), 800); // Small delay for realism
            }

            // Winner Logic
            if(match.status === 'finished') {
                if(activeMatchListener) activeMatchListener();
                
                setTimeout(async () => {
                    if(match.winner === 'Draw') {
                        alert("It's a DRAW! Coins refunded.");
                        await addCoins(match.bet); // refund
                    } else if (match.winner === mySymbol) {
                        alert(`🎉 YOU WON! (+${match.bet * 2} Coins)`);
                        await addCoins(match.bet * 2); // win double
                    } else {
                        alert(`❌ YOU LOST! Better luck next time.`);
                    }
                    tttGameArea.style.display = 'none'; tttSetup.style.display = 'block';
                    fetchMyCoins();
                }, 500);
            }
        }
    });
}

// User Click Cell
document.querySelectorAll('.ttt-cell').forEach(cell => {
    cell.addEventListener('click', async (e) => {
        let index = e.target.getAttribute('data-index');
        let snap = await dbGet(dbRef(db, `ttt_matches/${currentMatchId}`));
        if(!snap.exists()) return;
        
        let match = snap.val();
        if(match.status !== 'playing' || match.turn !== mySymbol || match.board[index] !== '') return;
        
        let newBoard = [...match.board];
        newBoard[index] = mySymbol;
        
        let nextTurn = (mySymbol === 'X') ? 'O' : 'X';
        let winner = checkTTTWin(newBoard);
        
        let updates = { board: newBoard, turn: nextTurn };
        if(winner) { updates.status = 'finished'; updates.winner = winner; }
        
        await dbUpdate(dbRef(db, `ttt_matches/${currentMatchId}`), updates);
    });
});

function checkTTTWin(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let w of wins) {
        if(b[w[0]] && b[w[0]] === b[w[1]] && b[w[0]] === b[w[2]]) return b[w[0]]; // 'X' or 'O'
    }
    if(!b.includes('')) return 'Draw';
    return null;
}

// ----------------------------------------------------
// UNBEATABLE BOT ALGORITHM (MINIMAX - FULL HARD)
// ----------------------------------------------------
async function playBotMove(match) {
    let board = [...match.board];
    let botSym = (match.hostSymbol === 'X') ? 'O' : 'X';
    let humanSym = match.hostSymbol;
    
    // Find best move using Minimax
    let bestScore = -Infinity;
    let bestMove = -1;
    
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
        let nextTurn = humanSym;
        let updates = { board: board, turn: nextTurn };
        if(winner) { updates.status = 'finished'; updates.winner = winner; }
        
        await dbUpdate(dbRef(db, `ttt_matches/${currentMatchId}`), updates);
    }
}

function minimax(board, depth, isMaximizing, botSym, humanSym) {
    let result = checkTTTWin(board);
    if(result === botSym) return 10 - depth;
    if(result === humanSym) return depth - 10;
    if(result === 'Draw') return 0;
    
    if(isMaximizing) {
        let bestScore = -Infinity;
        for(let i=0; i<9; i++) {
            if(board[i] === '') {
                board[i] = botSym;
                let score = minimax(board, depth+1, false, botSym, humanSym);
                board[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for(let i=0; i<9; i++) {
            if(board[i] === '') {
                board[i] = humanSym;
                let score = minimax(board, depth+1, true, botSym, humanSym);
                board[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// (Please ensure you also update your OLD Code Guess and Memory Match code to use the new `addCoins(pts)` function instead of `addPointsToUser`)
