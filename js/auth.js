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

if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

// Check URL if someone opened a shared profile link (e.g. index.html?user=UID)
const urlParams = new URLSearchParams(window.location.search);
const profileViewUid = urlParams.get('user');

onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-screen');
    const topNav = document.getElementById('top-nav');

    if (profileViewUid) {
        // VIEWING SOMEONE ELSE'S PROFILE VIA SHARE LINK
        authSec.style.display = 'none';
        mainSec.style.display = 'block';
        if(topNav) topNav.style.display = 'none'; // hide own menu
        document.getElementById('back-my-profile').style.display = 'block';

        loadProfileData(profileViewUid);
        return;
    }

    if (user) {
        authSec.style.display = 'none';
        mainSec.style.display = 'block';
        if(topNav) topNav.style.display = 'flex';
        
        loadProfileData(user.uid);
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
        if(data.fullname) document.getElementById('main-bio').innerText = data.fullname + " | " + (data.bio || "");
        
        if (data.profilePhoto) {
            document.getElementById('main-profile-img').src = data.profilePhoto;
            if(document.getElementById('corner-img')) document.getElementById('corner-img').src = data.profilePhoto;
        }
        
        if (data.songName) {
            document.getElementById('display-song-name').innerText = data.songName;
        }
        
        // Setup Social Handles dynamically
        const socialContainer = document.getElementById('social-buttons-container');
        socialContainer.innerHTML = "";
        
        if (data.instaLink) {
            socialContainer.innerHTML += `<a href="https://instagram.com/${data.instaLink}" target="_blank" style="background: #e1306c; color: white; padding: 6px 15px; border-radius: 15px; font-size: 12px; text-decoration: none; font-weight: bold;">Instagram</a>`;
        }
        if (data.ytLink) {
            socialContainer.innerHTML += `<a href="${data.ytLink}" target="_blank" style="background: #ff0000; color: white; padding: 6px 15px; border-radius: 15px; font-size: 12px; text-decoration: none; font-weight: bold;">YouTube</a>`;
        }

        window.currentMusicLink = data.spotifyLink || null;
        
        // Spotify Direct Button check
        if (window.currentMusicLink && window.currentMusicLink.includes("spotify.com")) {
            document.getElementById('spotify-redirect-container').style.display = 'block';
            document.getElementById('spotify-direct-link').href = window.currentMusicLink;
        }
    }
}

// Share Profile Button Logic
const shareBtn = document.getElementById('share-profile-btn');
if(shareBtn) {
    shareBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if(user) {
            const shareUrl = window.location.origin + window.location.pathname + "?user=" + user.uid;
            navigator.clipboard.writeText(shareUrl);
            alert("Profile link copied to clipboard! Share it with your friends.");
        }
    });
}

// Sound Toggle
const soundBtn = document.getElementById('sound-toggle');
const bgVideo = document.getElementById('main-bg-video');
if (soundBtn && bgVideo) {
    soundBtn.addEventListener('click', () => {
        bgVideo.muted = !bgVideo.muted;
        soundBtn.innerText = bgVideo.muted ? "🔇 Sound OFF" : "🔊 Sound ON";
    });
}

// Menu Dropdown
const cornerImg = document.getElementById('corner-img');
const dropdownMenu = document.getElementById('dropdown-menu');
if (cornerImg && dropdownMenu) {
    cornerImg.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });
}

// -----------------------------------------------------
// Smart Player (30s limit for Spotify, Full for YouTube)
// -----------------------------------------------------
const playBtn = document.getElementById('play-pause-btn');
const embedContainer = document.getElementById('embedded-player-container');
let isPlaying = false;

if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (!window.currentMusicLink) {
            alert("No music link provided by this user.");
            return;
        }

        let link = window.currentMusicLink;
        embedContainer.innerHTML = "";

        if (!isPlaying) {
            playBtn.innerText = "⏸";
            isPlaying = true;

            if (link.includes("youtube.com") || link.includes("youtu.be")) {
                let videoId = link.includes('v=') ? link.split('v=')[1].split('&')[0] : link.split('youtu.be/')[1].split('?')[0];
                embedContainer.innerHTML = `<iframe width="0" height="0" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay"></iframe>`;
            } 
            else if (link.includes("spotify.com")) {
                let trackId = link.split('track/')[1].split('?')[0];
                // Embed Spotify widget
                embedContainer.innerHTML = `<iframe style="border-radius:12px; margin-top:10px;" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allow="autoplay"></iframe>`;
                
                // Stop audio automatically after 30 seconds as requested
                setTimeout(() => {
                    embedContainer.innerHTML = "";
                    playBtn.innerText = "▶";
                    isPlaying = false;
                    alert("Spotify preview ended (30s limit). Click 'Play full song on Spotify' to listen completely!");
                }, 30000);
            }
        } else {
            playBtn.innerText = "▶";
            isPlaying = false;
            embedContainer.innerHTML = "";
        }
    });
}
