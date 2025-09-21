// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration.
// It first tries to get the config from a global variable (for Canvas environment)
// and falls back to environment variables for local development.
const firebaseConfig =
  typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      };

// Tambahkan pengecekan ini untuk memastikan API Key ada.
// Ini akan memberikan pesan error yang jauh lebih jelas jika .env tidak termuat.
if (!firebaseConfig.apiKey) {
  throw new Error(
    'Firebase API Key tidak ditemukan. Pastikan Anda memiliki file .env dengan VITE_FIREBASE_API_KEY dan sudah me-restart server pengembangan Anda.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };