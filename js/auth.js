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

// Check URL for short username parameter (e.g. index.html?u=username)
const urlParams = new URLSearchParams(window.location.search);
const profileUsername = urlParams.get('u');

onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-screen');
    const topNav = document.getElementById('top-nav');

    if (profileUsername) {
        // Username se target UID nikalna
        const uRef = await get(child(ref(db), `usernames/${profileUsername}`));
        if (uRef.exists()) {
            const targetUid = uRef.val();
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
                loadProfileData(targetUid);
                // YAHAN HUM USER KI UID BHEJ RAHE HAIN UNIQUE VIEW CHECK KE LIYE
                incrementViews(targetUid, user.uid); 
                return;
            }
        } else {
            alert("Profile not found!");
            window.location.href = "index.html";
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
        if(document.getElementById('main-bio')) {
            document.getElementById('main-bio').innerText = (data.fullname || "") + (data.bio ? " | " + data.bio : "");
        }
        
        if (data.profilePhoto) {
            document.getElementById('main-profile-img').src = data.profilePhoto;
            if(document.getElementById('corner-img')) document.getElementById('corner-img').src = data.profilePhoto;
        }
        
        const mainPlayBox = document.getElementById('main-play-box');
        window.mainMusicLink = data.mainMusicLink || null;
        if (window.mainMusicLink) {
            mainPlayBox.style.display = 'flex';
        } else {
            mainPlayBox.style.display = 'none';
        }

        const playlistBox = document.getElementById('music-playlist-container');
        const playlistContainer = document.getElementById('playlist-tracks');
        const songs = [data.music1, data.music2, data.music3].filter(link => link && link.trim() !== "");
        
        if(songs.length > 0) {
            playlistBox.style.display = 'block';
            playlistContainer.innerHTML = "";
            songs.forEach((link, idx) => {
                let isSpotify = link.includes("spotify.com");
                let isYouTube = link.includes("youtube.com") || link.includes("youtu.be");
                let platformName = `Playlist ${idx+1}`;
                let btnColor = "#555";
                
                if (isSpotify) {
                    platformName = `Spotify Playlist ${idx+1}`;
                    btnColor = "#1db954";
                } else if (isYouTube) {
                    platformName = `YouTube Playlist ${idx+1}`;
                    btnColor = "#ff0000";
                }

                playlistContainer.innerHTML += `<a href="${link}" target="_blank" style="display:block; background: ${btnColor}; color:white; padding:8px 12px; border-radius:10px; font-size:12px; text-decoration:none; font-weight:bold; text-align:center;">▶ ${platformName}</a>`;
            });
        } else {
            playlistBox.style.display = 'none';
        }
        
        const socialContainer = document.getElementById('social-buttons-container');
        socialContainer.innerHTML = "";
        let hasSocials = false;

        if (data.instaLink && data.instaLink.trim() !== "") {
            hasSocials = true;
            socialContainer.innerHTML += `<a href="https://instagram.com/${data.instaLink}" target="_blank" style="background: #e1306c; color: white; padding: 6px 12px; border-radius: 12px; font-size: 11px; text-decoration: none; font-weight: bold;">Instagram</a>`;
        }
        if (data.ytLink && data.ytLink.trim() !== "") {
            hasSocials = true;
            socialContainer.innerHTML += `<a href="${data.ytLink}" target="_blank" style="background: #ff0000; color: white; padding: 6px 12px; border-radius: 12px; font-size: 11px; text-decoration: none; font-weight: bold;">YouTube</a>`;
        }

        socialContainer.style.display = hasSocials ? 'flex' : 'none';
        loadViewsCount(targetUid);
    }
}

// Independent Play Button Logic
const playBtn = document.getElementById('play-pause-btn');
const embedContainer = document.getElementById('embedded-player-container');
let isPlaying = false;

if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (!window.mainMusicLink) return;

        let link = window.mainMusicLink;
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
                embedContainer.innerHTML = `<iframe style="border-radius:12px; margin-top:5px;" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allow="autoplay"></iframe>`;
                
                setTimeout(() => {
                    embedContainer.innerHTML = "";
                    playBtn.innerText = "▶";
                    isPlaying = false;
                }, 30000);
            }
        } else {
            playBtn.innerText = "▶";
            isPlaying = false;
            embedContainer.innerHTML = "";
        }
    });
}

// -----------------------------------------------------
// 🚀 UNIQUE PROFILE VIEWS LOGIC (FIXED)
// -----------------------------------------------------
async function incrementViews(targetUid, viewerUid) {
    // Agar khud ki profile dekh raha hai, toh view mat badhao
    if (!viewerUid || targetUid === viewerUid) return; 

    // Check karo ki kya is user ne pehle se dekha hai?
    const viewerRef = child(ref(db), `users/${targetUid}/viewedBy/${viewerUid}`);
    const snap = await get(viewerRef);

    if (!snap.exists()) {
        // Agar pehli baar dekh raha hai, toh database me record save karo
        await set(viewerRef, true);
        
        // Aur tab views ko +1 karo
        const viewRef = child(ref(db), `users/${targetUid}/profileViews`);
        const viewSnap = await get(viewRef);
        let currentViews = viewSnap.exists() ? viewSnap.val() : 0;
        await update(ref(db, `users/${targetUid}`), { profileViews: currentViews + 1 });
    }
}

async function loadViewsCount(targetUid) {
    const snap = await get(child(ref(db), `users/${targetUid}/profileViews`));
    const count = snap.exists() ? snap.val() : 0;
    if(document.getElementById('views-count')) document.getElementById('views-count').innerText = count;
}

// Updated Share Button (Generates short ?u=username link)
const shareBtn = document.getElementById('share-profile-btn');
if(shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if(user) {
            const userSnap = await get(child(ref(db), `users/${user.uid}/username`));
            const username = userSnap.exists() ? userSnap.val() : "";
            
            if(!username) {
                alert("Please set a username in Edit Profile first!");
                return;
            }

            const shareUrl = window.location.origin + window.location.pathname + "?u=" + username;
            navigator.clipboard.writeText(shareUrl);
            alert("Short profile link copied: " + shareUrl);
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

// Friends & Private Chat Logic
const friendsModal = document.getElementById('friends-modal');
if(document.getElementById('open-friends-menu')) {
    document.getElementById('open-friends-menu').addEventListener('click', () => {
        friendsModal.style.display = 'block';
        dropdownMenu.style.display = 'none';
    });
}
if(document.getElementById('close-friends-modal')) {
    document.getElementById('close-friends-modal').addEventListener('click', () => {
        friendsModal.style.display = 'none';
    });
}

const tabFind = document.getElementById('tab-find');
const tabReq = document.getElementById('tab-req');
const tabList = document.getElementById('tab-list');
const secFind = document.getElementById('section-find');
const secReq = document.getElementById('section-req');
const secList = document.getElementById('section-list');

if(tabFind) {
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
}

const searchBtn = document.getElementById('search-btn');
if(searchBtn) {
    searchBtn.addEventListener('click', async () => {
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
}

window.sendFriendReq = async function(targetUid) {
    const myUid = auth.currentUser.uid;
    await set(ref(db, `users/${targetUid}/friendRequests/${myUid}`), { timestamp: Date.now() });
    alert("Friend request sent!");
};

async function loadFriendRequests(myUid) {
    const reqDiv = document.getElementById('requests-list');
    if(!reqDiv) return;
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
    if(!listDiv) return;
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
    
    if (currentChatListener) {
        off(currentChatListener);
    }

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

const closeChatBox = document.getElementById('close-chat-box');
if(closeChatBox) {
    closeChatBox.addEventListener('click', () => {
        document.getElementById('private-chat-box').style.display = 'none';
        if (currentChatListener) off(currentChatListener);
        activeChatRoom = null;
    });
}

const sendChatBtn = document.getElementById('send-chat-btn');
if(sendChatBtn) {
    sendChatBtn.addEventListener('click', async () => {
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
}
