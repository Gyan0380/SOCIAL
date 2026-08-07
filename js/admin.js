import { auth, db } from './firebase.js';
import { ref, get, set, push, child, remove, update } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const loginOverlay = document.getElementById('login-overlay');
const adminPanel = document.getElementById('admin-panel');
const adminPassInput = document.getElementById('admin-pass');

// 1. Password Verification (Password Firebase ke 'admin_config' node mein store hoga)
document.getElementById('login-btn').addEventListener('click', async () => {
    const pass = adminPassInput.value;
    const snap = await get(child(ref(db), 'admin_config/password'));
    
    if(snap.exists() && snap.val() === pass) {
        loginOverlay.style.display = 'none';
        adminPanel.style.display = 'block';
        loadActiveItems();
    } else {
        alert("Wrong Password!");
    }
});

// 2. Add New Store Item
document.getElementById('add-item-btn').addEventListener('click', async () => {
    const name = document.getElementById('offer-name').value;
    const desc = document.getElementById('offer-desc').value;
    const price = document.getElementById('offer-price').value;
    const code = document.getElementById('offer-coupon').value;

    if(!name || !price || !code) return alert("Fill all fields!");

    const storeRef = push(ref(db, 'store'));
    await set(storeRef, {
        offerName: name,
        offerDesc: desc,
        price: parseInt(price),
        secretCode: code,
        isActive: true
    });
    alert("Item Added!");
    loadActiveItems();
});

// 3. Load Active Items for Admin to Manage
async function loadActiveItems() {
    const listDiv = document.getElementById('active-items-list');
    listDiv.innerHTML = '';
    const snap = await get(child(ref(db), 'store'));
    if(snap.exists()) {
        snap.forEach(s => {
            let item = s.val();
            if(item.isActive) {
                listDiv.innerHTML += `
                    <div style="background:rgba(255,255,255,0.1); padding:10px; margin-bottom:5px; border-radius:5px;">
                        ${item.offerName} (${item.price} Coins) 
                        <button onclick="removeItem('${s.key}')" style="background:#ff4757; padding:2px 5px; font-size:10px;">Remove</button>
                    </div>`;
            }
        });
    }
}

window.removeItem = async (id) => {
    await update(ref(db, `store/${id}`), { isActive: false });
    loadActiveItems();
};
