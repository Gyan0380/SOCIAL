import { auth, db } from './firebase.js'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

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

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

// Global UI State
onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-screen');
    const topNav = document.getElementById('top-nav');

    if (user) {
        if (authSec) authSec.style.display = 'none';
        if (mainSec) mainSec.style.display = 'block';
        if (topNav) topNav.style.display = 'flex';
        
        const snapshot = await get(child(ref(db), `users/${user.uid}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Set Usernames and Photos
            if (document.getElementById('main-username')) document.getElementById('main-username').innerText = (data.isPremium ? "⭐ @" : "@") + (data.username || "username");
            if (document.getElementById('main-profile-img') && data.profilePhoto) document.getElementById('main-profile-img').src = data.profilePhoto;
            if (document.getElementById('corner-img') && data.profilePhoto) document.getElementById('corner-img').src = data.profilePhoto;
            
            // Set Song Info
            if (document.getElementById('display-song-name')) {
                document.getElementById('display-song-name').innerText = data.songName || "No song added";
            }
            window.userMusicLink = data.spotifyLink || null; // Store for player
            
            // Set Notifications in Main Page
            if (data.notifications && document.getElementById('main-noti-list')) {
                document.getElementById('noti-count').style.display = 'inline-block';
                const notiList = document.getElementById('main-noti-list');
                notiList.innerHTML = '';
                Object.values(data.notifications).forEach(n => {
                    notiList.innerHTML += `<li style="margin-bottom:5px; border-bottom:1px solid #444; padding-bottom:5px;">${n.message}</li>`;
                });
            }
        }
    } else {
        if (authSec) authSec.style.display = 'block';
        if (mainSec) mainSec.style.display = 'none';
        if (topNav) topNav.style.display = 'none';
    }
});

// Sound Toggle
const soundBtn = document.getElementById('sound-toggle');
const bgVideo = document.getElementById('main-bg-video');
if (soundBtn && bgVideo) {
    soundBtn.addEventListener('click', () => {
        bgVideo.muted = !bgVideo.muted;
        soundBtn.innerText = bgVideo.muted ? "🔇 Sound OFF" : "🔊 Sound ON";
        soundBtn.style.background = bgVideo.muted ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 123, 255, 0.6)";
    });
}

// Corner Menu Dropdown Logic
const cornerImg = document.getElementById('corner-img');
const dropdownMenu = document.getElementById('dropdown-menu');
if (cornerImg && dropdownMenu) {
    cornerImg.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });
}

// Notification Bell Logic
const notiBell = document.getElementById('noti-bell-btn');
const notiDropdown = document.getElementById('noti-dropdown');
if(notiBell && notiDropdown) {
    notiBell.addEventListener('click', () => {
        notiDropdown.style.display = notiDropdown.style.display === 'none' ? 'block' : 'none';
        document.getElementById('noti-count').style.display = 'none';
    });
}

// Music Player Simulate Logic
const playBtn = document.getElementById('play-pause-btn');
const progressFill = document.getElementById('music-progress');
const currentTimeText = document.getElementById('current-time');
let isPlaying = false;
let musicInterval;

if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (!window.userMusicLink) {
            alert("No music link set! Update in Edit Profile.");
            return;
        }

        if (!isPlaying) {
            playBtn.innerText = "⏸"; 
            isPlaying = true;
            window.open(window.userMusicLink, '_blank'); 

            let seconds = 0;
            musicInterval = setInterval(() => {
                seconds++;
                let min = Math.floor(seconds / 60);
                let sec = seconds % 60;
                currentTimeText.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
                progressFill.style.width = `${(seconds / 180) * 100}%`;
                if(seconds >= 180) clearInterval(musicInterval);
            }, 1000);
            
        } else {
            playBtn.innerText = "▶"; 
            isPlaying = false;
            clearInterval(musicInterval);
        }
    });
}
