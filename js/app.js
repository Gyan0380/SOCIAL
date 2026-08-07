import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const profileUpload = document.getElementById('profile-upload');
const previewImg = document.getElementById('preview-img');
const saveBtn = document.getElementById('save-profile-btn');
const upiBtn = document.getElementById('submit-upi-btn');
let currentUser = null;
let base64String = "";
let customBgBase64 = "";

// Convert Main Profile Image
if (profileUpload) {
    profileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { base64String = ev.target.result; previewImg.src = base64String; };
            reader.readAsDataURL(file);
        }
    });
}

// Convert Premium Custom BG Image
const customBgUpload = document.getElementById('custom-bg-upload');
if (customBgUpload) {
    customBgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { customBgBase64 = ev.target.result; alert("Custom BG Selected!"); };
            reader.readAsDataURL(file);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) { currentUser = user; loadExistingProfile(user.uid); } 
    else { window.location.href = "index.html"; }
});

function loadExistingProfile(uid) {
    get(child(ref(db), `users/${uid}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('username').value = data.username || "";
            document.getElementById('fullname').value = data.fullname || "";
            document.getElementById('bio').value = data.bio || "";
            if (data.profilePhoto) { base64String = data.profilePhoto; previewImg.src = base64String; }
            if (data.customBgUrl) document.getElementById('custom-bg-url').value = data.customBgUrl;

            // Premium Expiry Logic
            const premiumSettings = document.getElementById('premium-settings');
            if (data.isPremium && data.premiumExpiry) {
                if (Date.now() > data.premiumExpiry) {
                    // Expired
                    update(ref(db, `users/${uid}`), { isPremium: false, premiumExpiry: null });
                    if (premiumSettings) premiumSettings.style.display = "none";
                    applyDefaultBg();
                } else {
                    // Active Premium
                    if (premiumSettings) premiumSettings.style.display = "block";
                    if (!data.isSuspended) applyCustomBg(data.customBgUrl, data.customBgImage);
                }
            } else {
                applyDefaultBg();
            }

            // Load Notifications
            if (data.notifications) {
                const notiBox = document.getElementById('notifications-box');
                const notiList = document.getElementById('noti-list');
                notiBox.style.display = 'block';
                notiList.innerHTML = '';
                Object.values(data.notifications).forEach(n => {
                    notiList.innerHTML += `<li style="margin-bottom:5px; border-bottom:1px solid #444; padding-bottom:5px;">${n.message}</li>`;
                });
            }
        }
    });
}

function applyDefaultBg() {
    const v = document.getElementById('profile-bg-video') || document.getElementById('main-bg-video');
    if (v) { v.src = "anime-video.mp4"; v.style.display = "block"; }
    document.body.style.backgroundImage = "none";
}

function applyCustomBg(url, imageBase64) {
    const v = document.getElementById('profile-bg-video') || document.getElementById('main-bg-video');
    if (url && v) {
        v.src = url; v.style.display = "block"; document.body.style.backgroundImage = "none";
    } else if (imageBase64) {
        if (v) v.style.display = "none";
        document.body.style.backgroundImage = `url(${imageBase64})`;
        document.body.style.backgroundSize = "cover"; document.body.style.backgroundPosition = "center";
    }
}

// Save Profile
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        if (!username) return alert("Username required!");
        saveBtn.innerText = "Saving...";

        const usernameRef = ref(db, `usernames/${username}`);
        const snap = await get(usernameRef);
        if (snap.exists() && snap.val() !== currentUser.uid) {
            alert("Username already taken!"); saveBtn.innerText = "Save Profile"; return;
        }

        const customUrl = document.getElementById('custom-bg-url').value.trim();

        await update(ref(db, `users/${currentUser.uid}`), {
            username: username,
            fullname: document.getElementById('fullname').value,
            bio: document.getElementById('bio').value,
            profilePhoto: base64String,
            customBgUrl: customUrl,
            customBgImage: customBgBase64 || null
        });
        await set(ref(db, `usernames/${username}`), currentUser.uid);
        alert("Saved Successfully!"); window.location.href = "index.html";
    });
}

// Submit UPI Request
if (upiBtn) {
    upiBtn.addEventListener('click', async () => {
        const upiId = document.getElementById('upi-input').value.trim();
        if (!upiId) return alert("Please enter UPI ID!");
        
        await update(ref(db, `users/${currentUser.uid}`), {
            paymentPending: true,
            paymentUpiId: upiId
        });
        
        const notiRef = push(ref(db, `users/${currentUser.uid}/notifications`));
        await set(notiRef, { message: "Your payment is pending. It will be confirmed within 12 hours.", timestamp: Date.now() });
        
        alert("Payment request sent to admin!");
        document.getElementById('upi-input').value = "";
    });
}
