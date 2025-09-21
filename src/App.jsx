import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { auth } from './firebase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import JadwalPage from './pages/JadwalPage.jsx';
import AbsensiPage from './pages/AbsensiPage.jsx';
import NilaiPage from './pages/NilaiPage.jsx';
import JurnalPage from './pages/JurnalPage.jsx';
import MasterDataPage from './pages/MasterDataPage.jsx';
import RekapitulasiPage from './pages/RekapitulasiPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import AnalisisSiswaPage from './pages/AnalisisDataPage.jsx';
import AsistenGuruPage from './pages/AsistenGuruPage.jsx';
import EarlyWarningPage from './pages/EarlyWarningPage.jsx';
import AnalisisRombelPage from './pages/AnalisisRombelPage.jsx';
import PelanggaranPage from './pages/PelanggaranPage.jsx';
import AnalisisKelasPage from './pages/AnalisisKelasPage.jsx';
import { ChatProvider } from './utils/ChatContext.jsx';

import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route 
          path="/*" 
          element={
            user ? (
              <ChatProvider>
                <DashboardLayout user={user}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/jadwal" element={<JadwalPage />} />
                    <Route path="/absensi" element={<AbsensiPage />} />
                    <Route path="/nilai" element={<NilaiPage />} />
                    <Route path="/jurnal" element={<JurnalPage />} />
                    <Route path="/master-data" element={<MasterDataPage />} />
                    <Route path="/rekapitulasi" element={<RekapitulasiPage />} />
                    <Route path="/analisis-siswa" element={<AnalisisSiswaPage />} />
                    <Route path="/analisis-kelas" element={<AnalisisKelasPage />} />
                    <Route path="/sistem-peringatan" element={<EarlyWarningPage />} />
                    <Route path="/asisten-guru" element={<AsistenGuruPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/analisis-rombel/:rombel" element={<AnalisisRombelPage />} />
                    <Route path="/pelanggaran" element={<PelanggaranPage />} />
                  </Routes>
                </DashboardLayout>
              </ChatProvider>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
