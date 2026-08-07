import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const profileUpload = document.getElementById('profile-upload');
const previewImg = document.getElementById('preview-img');
const saveBtn = document.getElementById('save-profile-btn');
let base64String = "";
let currentUser = null;

// 1. Convert Image to Base64 on Select
profileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            base64String = e.target.result; // Base64 Data
            previewImg.src = base64String;  // Show preview
        };
        reader.readAsDataURL(file);
    }
});

// 2. Wait for User to Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadExistingProfile(user.uid);
    } else {
        alert("Please login first!");
        window.location.href = "index.html";
    }
});

// 3. Load Profile if exists
function loadExistingProfile(uid) {
    get(child(ref(db), `users/${uid}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('username').value = data.username || "";
            document.getElementById('fullname').value = data.fullname || "";
            document.getElementById('bio').value = data.bio || "";
            document.getElementById('ig-link').value = data.ig || "";
            document.getElementById('fb-link').value = data.fb || "";
            document.getElementById('yt-link').value = data.song || "";
            
            if(data.profilePhoto) {
                base64String = data.profilePhoto;
                previewImg.src = base64String;
            }
        }
    });
}

// 4. Save Profile Data & Check Unique Username
saveBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    const username = document.getElementById('username').value.trim();
    const fullname = document.getElementById('fullname').value.trim();
    
    if (username === "") {
        alert("Username is required!");
        return;
    }

    saveBtn.innerText = "Saving...";

    try {
        // Check if username is already taken by someone else
        const usernameRef = ref(db, `usernames/${username}`);
        const snapshot = await get(usernameRef);
        
        if (snapshot.exists() && snapshot.val() !== currentUser.uid) {
            alert("This username is already taken. Try another one!");
            saveBtn.innerText = "Save Profile";
            return;
        }

        // Save data to Realtime Database
        const userData = {
            username: username,
            fullname: fullname,
            bio: document.getElementById('bio').value,
            ig: document.getElementById('ig-link').value,
            fb: document.getElementById('fb-link').value,
            song: document.getElementById('yt-link').value,
            profilePhoto: base64String, // Saved directly as text
            isPremium: false,
            email: currentUser.email
        };

        // Save under User Node
        await set(ref(db, `users/${currentUser.uid}`), userData);
        
        // Reserve the Username
        await set(ref(db, `usernames/${username}`), currentUser.uid);

        alert("Profile saved successfully!");
        window.location.href = "index.html"; // Go back to main screen
    } catch (error) {
        alert("Error saving profile: " + error.message);
    }
    
    saveBtn.innerText = "Save Profile";
});

