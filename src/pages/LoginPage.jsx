// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { GoogleAuthProvider } from 'firebase/auth'; // Keep GoogleAuthProvider for credential creation
import { auth } from '../firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'; // Import the plugin

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) {
      return;
    }
    setIsSigningIn(true);
    try {
      // Gunakan plugin Capacitor Firebase Authentication untuk Google Sign-In
      const result = await FirebaseAuthentication.signInWithGoogle();
      const { idToken, accessToken } = result.user;

      // Buat kredensial Firebase dari token yang didapat
      const credential = GoogleAuthProvider.credential(idToken, accessToken);

      // Masuk ke Firebase menggunakan kredensial ini
      await auth.signInWithCredential(credential);

      // Setelah berhasil, onAuthStateChanged di App.jsx akan menangani navigasi
    } catch (error) {
      setIsSigningIn(false);
      console.error("Gagal masuk dengan Google:", error);
      // Tambahkan penanganan error spesifik jika diperlukan, misal:
      // if (error.code === 'auth/popup-closed-by-user') { ... }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-gray-800 md:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
            <img src="/Logo Smart Teaching Baru_.png" alt="Logo" className="mb-4 h-24" />
            <h1 className="font-sans text-4xl font-bold text-blue-600 drop-shadow-lg">Smart Teaching</h1>
            <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
            Masuk untuk melanjutkan
            </p>
        </div>
        <button
          disabled={isSigningIn}
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-purple-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:cursor-not-allowed disabled:bg-purple-400"
        >
          <GraduationCap size={24} />
          <span className="text-lg font-semibold">{isSigningIn ? 'Memproses...' : 'Masuk dengan Akun Google'}</span>
        </button>
      </div>
    </div>
  );
};