import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const profileUpload = document.getElementById('profile-upload');
const previewImg = document.getElementById('preview-img');
const saveBtn = document.getElementById('save-profile-btn');
let currentUser = null;
let base64String = "";

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
            
            if (document.getElementById('main-music-link')) document.getElementById('main-music-link').value = data.mainMusicLink || "";
            if (document.getElementById('music-1')) document.getElementById('music-1').value = data.music1 || "";
            if (document.getElementById('music-2')) document.getElementById('music-2').value = data.music2 || "";
            if (document.getElementById('music-3')) document.getElementById('music-3').value = data.music3 || "";
            if (document.getElementById('ig-link')) document.getElementById('ig-link').value = data.instaLink || "";
            if (document.getElementById('yt-link')) document.getElementById('yt-link').value = data.ytLink || "";

            if (data.profilePhoto) { base64String = data.profilePhoto; previewImg.src = base64String; }
        }
    });
}

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

        await update(ref(db, `users/${currentUser.uid}`), {
            username: username,
            fullname: document.getElementById('fullname').value.trim(),
            bio: document.getElementById('bio').value.trim(),
            mainMusicLink: document.getElementById('main-music-link') ? document.getElementById('main-music-link').value.trim() : "",
            music1: document.getElementById('music-1') ? document.getElementById('music-1').value.trim() : "",
            music2: document.getElementById('music-2') ? document.getElementById('music-2').value.trim() : "",
            music3: document.getElementById('music-3') ? document.getElementById('music-3').value.trim() : "",
            instaLink: document.getElementById('ig-link') ? document.getElementById('ig-link').value.trim() : "",
            ytLink: document.getElementById('yt-link') ? document.getElementById('yt-link').value.trim() : "",
            profilePhoto: base64String || previewImg.src
        });
        await set(ref(db, `usernames/${username}`), currentUser.uid);
        alert("Saved Successfully!"); window.location.href = "index.html";
    });
}
