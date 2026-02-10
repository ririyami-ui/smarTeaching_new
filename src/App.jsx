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
import AsistenGuruPage from './pages/AsistenGuruPage.jsx';
import EarlyWarningPage from './pages/EarlyWarningPage.jsx';
import PelanggaranPage from './pages/PelanggaranPage.jsx';
import AnalisisKelasPage from './pages/AnalisisKelasPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import ProgramMengajarPage from './pages/ProgramMengajarPage.jsx';
import LessonPlanPage from './pages/LessonPlanPage.jsx';
import LkpdGeneratorPage from './pages/LkpdGeneratorPage.jsx';
import QuizGeneratorPage from './pages/QuizGeneratorPage.jsx';
import PenugasanPage from './pages/PenugasanPage.jsx';
import RekapIndividuPage from './pages/RekapIndividuPage.jsx';
import HandoutGeneratorPage from './pages/HandoutGeneratorPage.jsx';
import AssessmentKktpPage from './pages/PenilaianKktpPage.jsx';
import DatabaseCleanupPage from './pages/DatabaseCleanupPage.jsx';
import { ChatProvider } from './utils/ChatContext.jsx';
import { SettingsProvider } from './utils/SettingsContext.jsx';
import useScheduleNotifications from './hooks/useScheduleNotifications';
import InstallPwaCard from './components/InstallPwaCard.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';

import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useScheduleNotifications();

  // Check if PWA is already installed
  useEffect(() => {
    const checkPwaInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsPwaInstalled(isStandalone);
    };
    checkPwaInstalled();
  }, []);

  useEffect(() => {
    const cachedUser = JSON.parse(localStorage.getItem('user'));
    if (cachedUser) {
      setUser(cachedUser);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify(currentUser));
        setUser(currentUser);
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }
      setIsLoading(false);
    });

    // Ensure welcome screen is visible for at least 3.5 seconds
    const timer = setTimeout(() => {
      setIsWelcomeVisible(false);
    }, 3500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the browser's default prompt
      e.preventDefault();

      // Store the event for later use
      setInstallPrompt(e);

      // Check if user already dismissed it this session using session storage
      const isDismissed = sessionStorage.getItem('pwa_dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallCard(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = () => {
    if (!installPrompt) {
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setShowInstallCard(false);
      setInstallPrompt(null);
    });
  };

  const handleDismiss = () => {
    setShowInstallCard(false);
    sessionStorage.setItem('pwa_dismissed', 'true');
  };

  if (isWelcomeVisible || (isLoading && !user)) {
    return (
      <div className={!isWelcomeVisible ? 'animate-welcome-fade-out' : ''}>
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="bottom-center" reverseOrder={false} />
      <SettingsProvider>
        <ChatProvider>
          <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans transition-colors duration-200">
            {user ? (
              <DashboardLayout user={user}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/jadwal" element={<JadwalPage />} />
                  <Route path="/absensi" element={<AbsensiPage />} />
                  <Route path="/nilai" element={<NilaiPage />} />
                  <Route path="/jurnal" element={<JurnalPage />} />
                  <Route path="/rekapitulasi" element={<RekapitulasiPage />} />
                  <Route path="/rekap-individu" element={<RekapIndividuPage />} />
                  <Route path="/master-data" element={<MasterDataPage />} />
                  <Route path="/about" element={<AboutPage installPrompt={installPrompt} onInstall={handleInstall} isPwaInstalled={isPwaInstalled} />} />
                  <Route path="/analisis-kelas" element={<AnalisisKelasPage />} />
                  <Route path="/sistem-peringatan" element={<EarlyWarningPage />} />
                  <Route path="/asisten-guru" element={<AsistenGuruPage />} />
                  <Route path="/analisis-rombel/:rombel" element={<AnalisisKelasPage />} />
                  <Route path="/pelanggaran" element={<PelanggaranPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/program-mengajar" element={<ProgramMengajarPage />} />
                  <Route path="/rpp" element={<LessonPlanPage />} />
                  <Route path="/lkpd-generator" element={<LkpdGeneratorPage />} />
                  <Route path="/handout-generator" element={<HandoutGeneratorPage />} />
                  <Route path="/quiz-generator" element={<QuizGeneratorPage />} />
                  <Route path="/penugasan" element={<PenugasanPage />} />
                  <Route path="/penilaian-kktp" element={<AssessmentKktpPage />} />
                  <Route path="/database-cleanup" element={<DatabaseCleanupPage />} />
                </Routes>
              </DashboardLayout>
            ) : (
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            )}
          </div>
        </ChatProvider>
      </SettingsProvider>
      {showInstallCard && (
        <InstallPwaCard
          onInstall={handleInstall}
          onDismiss={handleDismiss}
        />
      )}
    </Router>
  );
}

export default App;
