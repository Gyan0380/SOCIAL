import { auth, db } from './firebase.js'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ref, get, child, update, push, set, remove, onChildAdded, off } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

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
        loadFriendRequests(user.uid);
        loadMyFriends(user.uid);
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
        if(data.fullname || data.bio) document.getElementById('main-bio').innerText = (data.fullname || "") + " | " + (data.bio || "");
        
        if (data.profilePhoto) {
            document.getElementById('main-profile-img').src = data.profilePhoto;
            if(document.getElementById('corner-img')) document.getElementById('corner-img').src = data.profilePhoto;
        }
        
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
// FRIENDS SYSTEM & PRIVATE CHAT LOGIC (FIXED)
// -----------------------------------------------------
const friendsModal = document.getElementById('friends-modal');
document.getElementById('open-friends-menu').addEventListener('click', () => {
    friendsModal.style.display = 'block';
    dropdownMenu.style.display = 'none';
});
document.getElementById('close-friends-modal').addEventListener('click', () => {
    friendsModal.style.display = 'none';
});

const tabFind = document.getElementById('tab-find');
const tabReq = document.getElementById('tab-req');
const tabList = document.getElementById('tab-list');
const secFind = document.getElementById('section-find');
const secReq = document.getElementById('section-req');
const secList = document.getElementById('section-list');

tabFind.addEventListener('click', () => {
    secFind.style.display = 'block'; secReq.style.display = 'none'; secList.style.display = 'none';
    tabFind.style.background = '#007bff'; tabReq.style.background = '#555'; tabList.style.background = '#555';
});
tabReq.addEventListener('click', () => {
    secFind.style.display = 'none'; secReq.style.display = 'block'; secList.style.display = 'none';
    tabReq.style.background = '#007bff'; tabFind.style.background = '#555'; tabList.style.background = '#555';
});
tabList.addEventListener('click', () => {
    secFind.style.display = 'none'; secReq.style.display = 'none'; secList.style.display = 'block';
    tabList.style.background = '#007bff'; tabFind.style.background = '#555'; tabReq.style.background = '#555';
});

document.getElementById('search-btn').addEventListener('click', async () => {
    const q = document.getElementById('search-username').value.trim();
    const res = document.getElementById('search-result');
    if(!q) return;
    res.innerHTML = "Searching...";

    const uRef = await get(child(ref(db), `usernames/${q}`));
    if(uRef.exists()) {
        const fUid = uRef.val();
        if(fUid === auth.currentUser.uid) {
            res.innerHTML = "<span style='color:orange; font-size:11px;'>This is your own username!</span>";
            return;
        }
        const fSnap = await get(child(ref(db), `users/${fUid}`));
        if(fSnap.exists()) {
            const fd = fSnap.val();
            res.innerHTML = `
                <div style="background:rgba(255,255,255,0.1); padding:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                    <span style="font-size:12px;">@${fd.username}</span>
                    <button onclick="sendFriendReq('${fUid}')" style="width:auto; padding:4px 8px; font-size:10px; background:#1db954; margin:0;">Add Friend</button>
                </div>
            `;
        }
    } else {
        res.innerHTML = "<span style='color:#ff4757; font-size:11px;'>User not found!</span>";
    }
});

window.sendFriendReq = async function(targetUid) {
    const myUid = auth.currentUser.uid;
    await set(ref(db, `users/${targetUid}/friendRequests/${myUid}`), { timestamp: Date.now() });
    alert("Friend request sent!");
};

async function loadFriendRequests(myUid) {
    const reqDiv = document.getElementById('requests-list');
    const snap = await get(child(ref(db), `users/${myUid}/friendRequests`));
    if(snap.exists()) {
        reqDiv.innerHTML = "";
        snap.forEach(async (childSnap) => {
            const senderUid = childSnap.key;
            const sSnap = await get(child(ref(db), `users/${senderUid}`));
            if(sSnap.exists()) {
                const sd = sSnap.val();
                reqDiv.innerHTML += `
                    <div style="background:rgba(255,255,255,0.1); padding:6px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:11px;">
                        <span>@${sd.username}</span>
                        <div>
                            <button onclick="acceptReq('${senderUid}')" style="width:auto; padding:3px 6px; font-size:10px; background:#2ed573; margin:0;">Accept</button>
                            <button onclick="denyReq('${senderUid}')" style="width:auto; padding:3px 6px; font-size:10px; background:#ff4757; margin:0;">Deny</button>
                        </div>
                    </div>
                `;
            }
        });
    } else {
        reqDiv.innerHTML = "<span style='font-size:11px; color:#aaa;'>No pending requests.</span>";
    }
}

window.acceptReq = async function(senderUid) {
    const myUid = auth.currentUser.uid;
    await set(ref(db, `users/${myUid}/friends/${senderUid}`), true);
    await set(ref(db, `users/${senderUid}/friends/${myUid}`), true);
    await remove(ref(db, `users/${myUid}/friendRequests/${senderUid}`));
    alert("Friend added!");
    location.reload();
};

window.denyReq = async function(senderUid) {
    const myUid = auth.currentUser.uid;
    await remove(ref(db, `users/${myUid}/friendRequests/${senderUid}`));
    alert("Request denied.");
    location.reload();
};

async function loadMyFriends(myUid) {
    const listDiv = document.getElementById('my-friends-list');
    const snap = await get(child(ref(db), `users/${myUid}/friends`));
    if(snap.exists()) {
        listDiv.innerHTML = "";
        snap.forEach(async (childSnap) => {
            const fUid = childSnap.key;
            const fSnap = await get(child(ref(db), `users/${fUid}`));
            if(fSnap.exists()) {
                const fd = fSnap.val();
                listDiv.innerHTML += `
                    <div style="background:rgba(255,255,255,0.1); padding:6px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:11px;">
                        <span>@${fd.username}</span>
                        <button onclick="openChat('${fUid}', '${fd.username}')" style="width:auto; padding:3px 8px; font-size:10px; background:#1db954; margin:0;">Chat</button>
                    </div>
                `;
            }
        });
    } else {
        listDiv.innerHTML = "<span style='font-size:11px; color:#aaa;'>No friends added yet.</span>";
    }
}

let activeChatRoom = null;
let currentChatListener = null;

window.openChat = function(friendUid, friendName) {
    const myUid = auth.currentUser.uid;
    document.getElementById('private-chat-box').style.display = 'block';
    document.getElementById('chatting-with-name').innerText = "Chat with @" + friendName;
    
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = "";
    
    // Purana listener hatao taaki doosre friend ke messages mix na hon
    if (currentChatListener) {
        off(currentChatListener);
    }

    // Har do doston ka ek alag unique room banta hai
    activeChatRoom = myUid < friendUid ? `${myUid}_${friendUid}` : `${friendUid}_${myUid}`;
    
    currentChatListener = ref(db, `private_chats/${activeChatRoom}`);
    onChildAdded(currentChatListener, (snapshot) => {
        const msg = snapshot.val();
        const msgId = snapshot.key;
        const age = Date.now() - msg.timestamp;

        if(age > 180000) {
            remove(ref(db, `private_chats/${activeChatRoom}/${msgId}`));
            return;
        }

        msgContainer.innerHTML += `<div><b>@${msg.sender}:</b> ${msg.message}</div>`;
        msgContainer.scrollTop = msgContainer.scrollHeight;

        setTimeout(() => {
            remove(ref(db, `private_chats/${activeChatRoom}/${msgId}`));
        }, 180000 - age);
    });
};

document.getElementById('close-chat-box').addEventListener('click', () => {
    document.getElementById('private-chat-box').style.display = 'none';
    if (currentChatListener) off(currentChatListener);
    activeChatRoom = null;
});

document.getElementById('send-chat-btn').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !activeChatRoom) return;

    const user = auth.currentUser;
    const msgRef = push(ref(db, `private_chats/${activeChatRoom}`));
    
    const userSnap = await get(child(ref(db), `users/${user.uid}/username`));
    const username = userSnap.exists() ? userSnap.val() : "user";

    await set(msgRef, {
        sender: username,
        message: text,
        timestamp: Date.now()
    });
    input.value = "";
});
