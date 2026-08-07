import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDc8SBATauI9wMiwvIsrYsIuyXD_QOCKB8",
  authDomain: "developer-ab7cb.firebaseapp.com",
  databaseURL: "https://developer-ab7cb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "developer-ab7cb",
  storageBucket: "developer-ab7cb.appspot.com",
  messagingSenderId: "178491662020",
  appId: "1:178491662020:web:3f8e69fe48e91f8d802379"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
