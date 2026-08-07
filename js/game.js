import { auth, db } from './firebase.js';
// FIXED IMPORTS (Only use database imports from database URL)
import { ref, get, child, update, set, onValue, remove, push, off } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// --- Navigation Logic ---
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

// Tabs Logic
function hideAllHubSecs() {
    secPlayGames.style.display = 'none'; secLeaderboard.style.display = 'none';
    secStore.style.display = 'none'; secPurchases.style.display = 'none';
    tabPlayGames.style.background = '#555'; tabLeaderboard.style.background = '#555';
    tabStore.style.background = '#555'; tabPurchases.style.background = '#555';
}

if(tabPlayGames) tabPlayGames.addEventListener('click', () => { hideAllHubSecs(); secPlayGames.style.display = 'block'; tabPlayGames.style.background = '#9b59b6'; });
if(tabLeaderboard) tabLeaderboard.addEventListener('click', () => { hideAllHubSecs(); secLeaderboard.style.display = 'block'; tabLeaderboard.style.background = '#9b59b6'; loadGlobalLeaderboard(); });
if(tabStore) tabStore.addEventListener('click', () => { hideAllHubSecs(); secStore.style.display = 'block'; tabStore.style.background = '#9b59b6'; loadStoreItems(); });
if(tabPurchases) tabPurchases.addEventListener('click', () => { hideAllHubSecs(); secPurchases.style.display = 'block'; tabPurchases.style.background = '#9b59b6'; loadMyPurchases(); });

// ==========================================
// STORE & INVENTORY SYSTEM (NEW)
// ==========================================

async function loadStoreItems() {
    const listDiv = document.getElementById('store-items-list');
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
        // Fetch item details
        const itemSnap = await get(ref(db, `store/${itemId}`));
        if(!itemSnap.exists() || !itemSnap.val().isActive) return alert("Offer expired or not available!");
        const itemData = itemSnap.val();

        // Auto Deduct Coins
        myGlobalCoins -= price;
        if(navCoinsDisplay) navCoinsDisplay.innerText = myGlobalCoins;
        if(hubCoinsDisplay) hubCoinsDisplay.innerText = myGlobalCoins;
        await update(ref(db, `users/${uid}`), { coins: myGlobalCoins });

        // Add to User's My Purchases (Copy hidden code)
        const purchaseRef = push(ref(db, `users/${uid}/purchases`));
        await set(purchaseRef, {
            offerName: itemData.offerName,
            offerDesc: itemData.offerDesc,
            secretCode: itemData.secretCode, // The hidden coupon code
            timestamp: Date.now()
        });

        alert("Purchase Successful! Code has been added to 'My Items'.");
        tabPurchases.click(); // Auto switch to purchases tab
    } catch(err) {
        console.error("Purchase error", err);
        alert("Transaction Failed!");
    }
}

async function loadMyPurchases() {
    const listDiv = document.getElementById('my-purchases-list');
    if(!auth.currentUser) return;
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
// UNIVERSAL COINS & LEADERBOARD SYSTEM
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

// ❌⭕ TIC-TAC-TOE MODAL LOGIC...
const openTTTBtn = document.getElementById('btn-open-tic-tac-toe');
const tttModal = document.getElementById('tic-tac-toe-modal');
const backToHubTTTBtn = document.getElementById('back-to-hub-ttt');
if(openTTTBtn) openTTTBtn.addEventListener('click', () => { hubModal.style.display = 'none'; tttModal.style.display = 'block'; fetchMyCoins(); });
if(backToHubTTTBtn) backToHubTTTBtn.addEventListener('click', () => { tttModal.style.display = 'none'; hubModal.style.display = 'block'; });

// (Aapke baaki saare games ke logic jaise Tic-Tac-Toe matchmaking yahan niche rahenge, unhe as it is rakhna hai jo pichle code me the)
