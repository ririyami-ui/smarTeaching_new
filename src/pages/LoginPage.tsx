// Berkas: src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const isNative = ['android', 'ios'].includes(Capacitor.getPlatform());
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        const accessToken = result.credential?.accessToken;
        if (!idToken) throw new Error('Failed to get ID token');
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          if (popupError?.code === 'auth/popup-blocked') {
            toast.loading('Popup diblokir, mengalihkan...', { duration: 2000 });
            const { signInWithRedirect } = await import('firebase/auth');
            await signInWithRedirect(auth, provider);
            return; // Exit early as page will redirect
          } else {
            throw popupError;
          }
        }
      }
      toast.success('Berhasil masuk!');
      navigate('/');
    } catch (error: unknown) {
      setIsSigningIn(false);

      const err = error as { code?: string; message?: string };

      if (err.code === 'auth/popup-closed-by-user') {
        toast.error('Login dibatalkan');
      } else if (err.code === 'auth/network-request-failed') {
        toast.error(
          <div>
            <p className="font-bold text-sm">Gagal koneksi!</p>
            <p className="text-[10px] leading-tight">Pastikan internet stabil dan tidak ada VPN/Proxy yang memblokir Firebase.</p>
          </div>
        );
      } else {
        toast.error(`Gagal: ${err.message || 'Unknown error'}`);
        console.error("Auth Error:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-gray-800 md:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/Logo Smart Teaching Baru_.png" alt="Logo" loading="lazy" decoding="async" className="mb-4 h-24" />
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
        <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-700/50 pt-4 animate-in fade-in duration-700">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">© Ririyami, S.Kom</p>
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 tracking-wider uppercase mt-0.5">build version 2.03j</p>
        </div>
      </div>
    </div>
  );
}



