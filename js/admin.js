import { db } from './firebase.js';
import { ref, onValue, update, push, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, child, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Make functions globally available for inline onclick attributes in HTML
window.approvePayment = approvePayment;
window.denyPayment = denyPayment;
window.revokePremium = revokePremium;
window.suspendPremium = suspendPremium;
window.addDays = addDays;

// 1. Fetch & Display Users
const usersRef = ref(db, 'users');
onValue(usersRef, (snapshot) => {
    const pendingList = document.getElementById('pending-payments-list');
    const premiumList = document.getElementById('active-premium-list');
    
    pendingList.innerHTML = '';
    premiumList.innerHTML = '';

    if (snapshot.exists()) {
        const users = snapshot.val();
        
        for (const [uid, data] of Object.entries(users)) {
            
            // Render Pending Payments
            if (data.paymentPending) {
                pendingList.innerHTML += `
                    <div class="user-card">
                        <div>
                            <strong>${data.username || 'Unknown'}</strong> (${data.email})<br>
                            <small>UPI ID/Name Sent: ${data.paymentUpiId}</small>
                        </div>
                        <div>
                            <button class="action-btn btn-green" onclick="approvePayment('${uid}')">Accept (20 Days)</button>
                            <button class="action-btn btn-red" onclick="denyPayment('${uid}')">Deny</button>
                        </div>
                    </div>
                `;
            }

            // Render Active Premium Users
            if (data.isPremium) {
                const expiryDate = new Date(data.premiumExpiry).toLocaleDateString();
                const suspendedText = data.isSuspended ? "<span style='color:red;'>(Suspended)</span>" : "";
                
                premiumList.innerHTML += `
                    <div class="user-card" style="border-left-color: gold;">
                        <div>
                            <strong>⭐ ${data.username || 'Unknown'}</strong> ${suspendedText}<br>
                            <small>Expires on: ${expiryDate}</small>
                        </div>
                        <div>
                            <input type="number" id="days-${uid}" placeholder="Days" style="width: 60px; padding: 4px;">
                            <button class="action-btn btn-green" onclick="addDays('${uid}')">+ Add</button>
                            <button class="action-btn btn-orange" onclick="suspendPremium('${uid}', ${!data.isSuspended})">
                                ${data.isSuspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button class="action-btn btn-red" onclick="revokePremium('${uid}')">Revoke</button>
                        </div>
                    </div>
                `;
            }
        }
    } else {
        pendingList.innerHTML = '<p>No pending payments.</p>';
        premiumList.innerHTML = '<p>No active premium users.</p>';
    }
});

// 2. Approve Payment (Grants 20 Days Premium)
async function approvePayment(uid) {
    if (!confirm("Accept this payment and grant 20 days premium?")) return;

    const expiryTime = Date.now() + (20 * 24 * 60 * 60 * 1000); // Current time + 20 Days in milliseconds

    await update(ref(db, `users/${uid}`), {
        isPremium: true,
        isSuspended: false,
        premiumExpiry: expiryTime,
        paymentPending: null, // Clear pending status
        paymentUpiId: null
    });

    sendPersonalNotification(uid, "Your premium is accepted! You got 20 days of premium access.");
    alert("Payment Approved! Premium Granted.");
}

// 3. Deny Payment
async function denyPayment(uid) {
    if (!confirm("Deny this payment?")) return;

    await update(ref(db, `users/${uid}`), {
        paymentPending: null,
        paymentUpiId: null
    });

    sendPersonalNotification(uid, "Your payment was denied. If you think this is a mistake, please contact admin.");
}

// 4. Revoke Premium Completely
async function revokePremium(uid) {
    if (!confirm("Are you sure you want to completely revoke premium?")) return;

    await update(ref(db, `users/${uid}`), {
        isPremium: false,
        premiumExpiry: null
    });

    sendPersonalNotification(uid, "Your premium subscription has been revoked by the admin.");
}

// 5. Suspend/Unsuspend Premium (Temporarily pause features)
async function suspendPremium(uid, suspendState) {
    await update(ref(db, `users/${uid}`), {
        isSuspended: suspendState
    });

    const msg = suspendState ? "Your premium account has been suspended." : "Your premium account has been unsuspended.";
    sendPersonalNotification(uid, msg);
}

// 6. Increase/Add Days to Existing Premium
async function addDays(uid) {
    const daysToAdd = parseInt(document.getElementById(`days-${uid}`).value);
    if (!daysToAdd || daysToAdd <= 0) {
        alert("Please enter a valid number of days.");
        return;
    }

    // Get current expiry
    get(child(ref(db), `users/${uid}/premiumExpiry`)).then((snapshot) => {
        let currentExpiry = snapshot.exists() ? snapshot.val() : Date.now();
        let newExpiry = currentExpiry + (daysToAdd * 24 * 60 * 60 * 1000);

        update(ref(db, `users/${uid}`), { premiumExpiry: newExpiry });
        sendPersonalNotification(uid, `Admin added ${daysToAdd} extra days to your premium subscription!`);
        alert(`${daysToAdd} days added successfully.`);
    });
}

// 7. Notification System
function sendPersonalNotification(uid, message) {
    const notiRef = push(ref(db, `users/${uid}/notifications`));
    set(notiRef, {
        message: message,
        timestamp: Date.now()
    });
}

document.getElementById('send-noti-btn').addEventListener('click', () => {
    const msg = document.getElementById('admin-message').value.trim();
    if (msg === "") {
        alert("Message cannot be empty!");
        return;
    }

    // Push to global_notifications
    const globalNotiRef = push(ref(db, 'global_notifications'));
    set(globalNotiRef, {
        message: msg,
        timestamp: Date.now()
    });

    alert("Global notification sent to all users!");
    document.getElementById('admin-message').value = ""; // Clear box
});

