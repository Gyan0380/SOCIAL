import { db } from './firebase.js';
import { ref, onValue, update, push, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

window.acceptPay = acceptPay;
window.denyPay = denyPay;
window.revoke = revoke;

// Fetch Data Realtime
onValue(ref(db, 'users'), (snapshot) => {
    const pendList = document.getElementById('pending-list');
    const premList = document.getElementById('premium-list');
    pendList.innerHTML = ''; premList.innerHTML = '';

    if (snapshot.exists()) {
        for (const [uid, data] of Object.entries(snapshot.val())) {
            
            // Pending Payments
            if (data.paymentPending) {
                pendList.innerHTML += `
                <div class="user-item">
                    <div><b>${data.username}</b> | UPI: ${data.paymentUpiId}</div>
                    <div>
                        <button class="bg-green" onclick="acceptPay('${uid}')">Accept (20 Days)</button>
                        <button class="bg-red" onclick="denyPay('${uid}')">Deny</button>
                    </div>
                </div>`;
            }

            // Premium Users
            if (data.isPremium) {
                const exp = new Date(data.premiumExpiry).toLocaleDateString();
                premList.innerHTML += `
                <div class="user-item" style="border-left-color: gold;">
                    <div><b>⭐ ${data.username}</b> | Expires: ${exp}</div>
                    <div><button class="bg-red" onclick="revoke('${uid}')">Revoke</button></div>
                </div>`;
            }
        }
    }
});

// Admin Functions
async function acceptPay(uid) {
    if(!confirm("Accept 20 Days Premium?")) return;
    await update(ref(db, `users/${uid}`), {
        isPremium: true, isSuspended: false, paymentPending: null, paymentUpiId: null,
        premiumExpiry: Date.now() + (20 * 24 * 60 * 60 * 1000) // +20 Days
    });
    pushNoti(uid, "Your premium is accepted! You got 20 days premium access.");
}

async function denyPay(uid) {
    await update(ref(db, `users/${uid}`), { paymentPending: null, paymentUpiId: null });
    pushNoti(uid, "Your payment was denied.");
}

async function revoke(uid) {
    if(!confirm("Revoke premium?")) return;
    await update(ref(db, `users/${uid}`), { isPremium: false, premiumExpiry: null });
    pushNoti(uid, "Your premium subscription was revoked by Admin.");
}

function pushNoti(uid, msg) {
    set(push(ref(db, `users/${uid}/notifications`)), { message: msg, timestamp: Date.now() });
}

// Global Notification
document.getElementById('send-btn').addEventListener('click', () => {
    const msg = document.getElementById('admin-msg').value;
    if(msg) {
        set(push(ref(db, 'global_notifications')), { message: msg, timestamp: Date.now() });
        alert("Sent!"); document.getElementById('admin-msg').value = "";
    }
});
