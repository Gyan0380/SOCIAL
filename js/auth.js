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

// Global UI State & Load Username
onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-screen');
    const cornerProfile = document.getElementById('corner-profile');
    const displayName = document.getElementById('user-display-name');

    if (user) {
        if (authSec) authSec.style.display = 'none';
        if (mainSec) mainSec.style.display = 'block';
        if (cornerProfile) cornerProfile.style.display = 'block';
        
        // Fetch User Data for Main Page
        const snapshot = await get(child(ref(db), `users/${user.uid}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (displayName) displayName.innerText = data.username || "User";
            if (document.getElementById('main-username')) document.getElementById('main-username').innerText = (data.isPremium ? "⭐ @" : "@") + (data.username || "user");
            if (document.getElementById('main-profile-img') && data.profilePhoto) {
                document.getElementById('main-profile-img').src = data.profilePhoto;
            }
        } else {
            if (displayName) displayName.innerText = "Set Profile";
        }
    } else {
        if (authSec) authSec.style.display = 'block';
        if (mainSec) mainSec.style.display = 'none';
        if (cornerProfile) cornerProfile.style.display = 'none';
    }
});

// Sound Toggle Logic
const soundBtn = document.getElementById('sound-toggle');
const bgVideo = document.getElementById('main-bg-video');

if (soundBtn && bgVideo) {
    soundBtn.addEventListener('click', () => {
        bgVideo.muted = !bgVideo.muted;
        soundBtn.innerText = bgVideo.muted ? "🔇 Sound OFF" : "🔊 Sound ON";
        soundBtn.style.background = bgVideo.muted ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 123, 255, 0.6)";
    });
}
