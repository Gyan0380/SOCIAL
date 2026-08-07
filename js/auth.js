import { auth, db } from './firebase.js'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, get, child, update, push, set, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const authBtn = document.getElementById('auth-btn');
const toggleLink = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logout-btn');
let isLoginMode = true;

if (toggleLink) {
    toggleLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.getElementById('form-title').innerText = isLoginMode ? "Sign In" : "Create Account";
        authBtn.innerText = isLoginMode ? "Sign In" : "Sign Up";
        toggleLink.innerText = isLoginMode ? "Create New Account" : "Sign In to Existing Account";
    });
}

if (authBtn) {
    authBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value.trim();
        if (isLoginMode) {
            signInWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
        } else {
            createUserWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
        }
    });
}

if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

const urlParams = new URLSearchParams(window.location.search);
const profileViewUid = urlParams.get('user');

onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-screen');
    const topNav = document.getElementById('top-nav');

    if (profileViewUid) {
        if (!user) {
            authSec.style.display = 'block';
            mainSec.style.display = 'none';
            if(topNav) topNav.style.display = 'none';
            return;
        } else {
            authSec.style.display = 'none';
            mainSec.style.display = 'block';
            if(topNav) topNav.style.display = 'none';
            document.getElementById('back-my-profile').style.display = 'block';
            loadProfileData(profileViewUid);
            incrementViews(profileViewUid);
            return;
        }
    }

    if (user) {
        authSec.style.display = 'none';
        mainSec.style.display = 'block';
        if(topNav) topNav.style.display = 'flex';
        loadProfileData(user.uid);
        loadViewsCount(user.uid);
    } else {
        authSec.style.display = 'block';
        mainSec.style.display = 'none';
        if(topNav) topNav.style.display = 'none';
    }
});

async function loadProfileData(targetUid) {
    const snapshot = await get(child(ref(db), `users/${targetUid}`));
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        document.getElementById('main-username').innerText = (data.isPremium ? "⭐ @" : "@") + (data.username || "user");
        if(data.fullname || data.bio) document.getElementById('main-bioलेक्ट्र릭').innerText = (data.fullname || "") + " | " + (data.bio || "");
        
        if (data.profilePhoto) {
            document.getElementById('main-profile-img').src = data.profilePhoto;
            if(document.getElementById('corner-img')) document.getElementById('corner-img').src = data.profilePhoto;
        }
        
        // Render Music Playlist (Max 3)
        const playlistContainer = document.getElementById('playlist-tracks');
        playlistContainer.innerHTML = "";
        
        const songs = [data.music1, data.music2, data.music3].filter(Boolean);
        if(songs.length === 0) {
            playlistContainer.innerHTML = "<span style='font-size:11px; color:#aaa;'>No songs added</span>";
        } else {
            songs.forEach((link, idx) => {
                let isSpotify = link.includes("spotify.com");
                let btnText = isSpotify ? `🟢 Play Song ${idx+1} on Spotify` : `▶ Play Song ${idx+1} (YouTube)`;
                playlistContainer.innerHTML += `<a href="${link}" target="_blank" style="display:block; background: ${isSpotify ? '#1db954' : '#ff0000'}; color:white; padding:8px 12px; border-radius:8px; font-size:12px; text-decoration:none; font-weight:bold; text-align:center;">${btnText}</a>`;
            });
        }
        
        // Social Handles Redirect Buttons
        const socialContainer = document.getElementById('social-buttons-container');
        socialContainer.innerHTML = "";
        if (data.instaLink) {
            socialContainer.innerHTML += `<a href="https://instagram.com/${data.instaLink}" target="_blank" style="background: #e1306c; color: white; padding: 6px 12px; border-radius: 12px; font-size: 11px; text-decoration: none; font-weight: bold;">Instagram</a>`;
        }
        if (data.ytLink) {
            socialContainer.innerHTML += `<a href="${data.ytLink}" target="_blank" style="background: #ff0000; color: white; padding: 6px 12px; border-radius: 12px; font-size: 11px; text-decoration: none; font-weight: bold;">YouTube</a>`;
        }
        
        loadViewsCount(targetUid);
    }
}

async function incrementViews(targetUid) {
    const viewRef = child(ref(db), `users/${targetUid}/profileViews`);
    const snap = await get(viewRef);
    let currentViews = snap.exists() ? snap.val() : 0;
    await update(ref(db, `users/${targetUid}`), { profileViews: currentViews + 1 });
}

async function loadViewsCount(targetUid) {
    const snap = await get(child(ref(db), `users/${targetUid}/profileViews`));
    const count = snap.exists() ? snap.val() : 0;
    if(document.getElementById('views-count')) document.getElementById('views-count').innerText = count;
}

// Share Button
const shareBtn = document.getElementById('share-profile-btn');
if(shareBtn) {
    shareBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if(user) {
            const shareUrl = window.location.origin + window.location.pathname + "?user=" + user.uid;
            navigator.clipboard.writeText(shareUrl);
            alert("Profile link copied!");
        }
    });
}

// Sound & Menu
const soundBtn = document.getElementById('sound-toggle');
const bgVideo = document.getElementById('main-bg-video');
if (soundBtn && bgVideo) {
    soundBtn.addEventListener('click', () => {
        bgVideo.muted = !bgVideo.muted;
        soundBtn.innerText = bgVideo.muted ? "🔇 Sound OFF" : "🔊 Sound ON";
    });
}

const cornerImg = document.getElementById('corner-img');
const dropdownMenu = document.getElementById('dropdown-menu');
if (cornerImg && dropdownMenu) {
    cornerImg.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });
}

// -----------------------------------------------------
// CHAT SYSTEM WITH 3-MINUTE AUTO DELETE
// -----------------------------------------------------
const openChatBtn = document.getElementById('open-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatSection = document.getElementById('chat-section');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatMessages = document.getElementById('chat-messages');

if(openChatBtn) {
    openChatBtn.addEventListener('click', () => {
        chatSection.style.display = 'flex';
        dropdownMenu.style.display = 'none';
    });
}
if(closeChatBtn) {
    closeChatBtn.addEventListener('click', () => { chatSection.style.display = 'none'; });
}

if(sendChatBtn) {
    sendChatBtn.addEventListener('click', async () => {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;

        const user = auth.currentUser;
        const chatRef = push(ref(db, 'community_chat'));
        
        // Save message with timestamp
        await set(chatRef, {
            email: user.email.split('@')[0],
            message: text,
            timestamp: Date.now()
        });
        input.value = "";
    });
}

// Listen to chat & auto delete messages older than 3 minutes (180,000 ms)
const chatDbRef = ref(db, 'community_chat');
onChildAdded(chatDbRef, (snapshot) => {
    const msgData = snapshot.val();
    const msgId = snapshot.key;
    const age = Date.now() - msgData.timestamp;

    if (age > 180000) {
        // Already older than 3 mins, delete it immediately
        remove(ref(db, `community_chat/${msgId}`));
        return;
    }

    // Append to UI
    chatMessages.innerHTML += `<div><b>@${msgData.email}:</b> ${msgData.message}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Schedule auto-delete remaining time
    setTimeout(() => {
        remove(ref(db, `community_chat/${msgId}`));
        // Reload or clear UI if needed, Firebase real-time listeners handle cleanliness
    }, 180000 - age);
});

