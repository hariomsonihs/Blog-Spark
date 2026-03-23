import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkw9HIjuET67of-fWDuHMjvBddr6ooA2Y",
  authDomain: "blogspark-9d104.firebaseapp.com",
  projectId: "blogspark-9d104",
  storageBucket: "blogspark-9d104.firebasestorage.app",
  messagingSenderId: "495239379893",
  appId: "1:495239379893:web:fb333990d40f51a473b7fc",
  measurementId: "G-RFKCRDDZ6Y",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initAnalytics() {
  try {
    const supported = await isSupported();
    if (supported) {
      getAnalytics(app);
    }
  } catch (error) {
    console.warn("Analytics not initialized:", error?.message || error);
  }
}

initAnalytics();

export { app, db };