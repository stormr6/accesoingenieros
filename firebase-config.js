// ============================================================
// Replace the values below with your Firebase project credentials
// Firebase Console → Project Settings → Your Apps → SDK Setup
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDotnz-rogdyJit4SPJNhyxROKpW9VqAnw",
  authDomain: "accesoingenieros.firebaseapp.com",
  projectId: "accesoingenieros",
  storageBucket: "accesoingenieros.firebasestorage.app",
  messagingSenderId: "779898752515",
  appId: "1:779898752515:web:44d11a34572e4656bc4836"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
