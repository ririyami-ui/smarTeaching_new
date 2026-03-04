import React, { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { auth } from './firebase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import { ChatProvider } from './utils/ChatContext.jsx';
import { SettingsProvider } from './utils/SettingsContext.jsx';
import InstallPwaCard from './components/InstallPwaCard.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import './index.css';

// Lazy load pages for bundle optimization
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const JadwalPage = lazy(() => import('./pages/JadwalPage.jsx'));
const AbsensiPage = lazy(() => import('./pages/AbsensiPage.jsx'));
const NilaiPage = lazy(() => import('./pages/NilaiPage.jsx'));
const JurnalPage = lazy(() => import('./pages/JurnalPage.jsx'));
const MasterDataPage = lazy(() => import('./pages/MasterDataPage.jsx'));
const RekapitulasiPage = lazy(() => import('./pages/RekapitulasiPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const AsistenGuruPage = lazy(() => import('./pages/AsistenGuruPage.jsx'));
const EarlyWarningPage = lazy(() => import('./pages/EarlyWarningPage.jsx'));
const PelanggaranPage = lazy(() => import('./pages/PelanggaranPage.jsx'));
const AnalisisKelasPage = lazy(() => import('./pages/AnalisisKelasPage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const ProgramMengajarPage = lazy(() => import('./pages/ProgramMengajarPage.jsx'));
const LessonPlanPage = lazy(() => import('./pages/LessonPlanPage.jsx'));
const LkpdGeneratorPage = lazy(() => import('./pages/LkpdGeneratorPage.jsx'));
const QuizGeneratorPage = lazy(() => import('./pages/QuizGeneratorPage.jsx'));
const PenugasanPage = lazy(() => import('./pages/PenugasanPage.jsx'));
const RekapIndividuPage = lazy(() => import('./pages/RekapIndividuPage.jsx'));
const HandoutGeneratorPage = lazy(() => import('./pages/HandoutGeneratorPage.jsx'));
const AssessmentKktpPage = lazy(() => import('./pages/PenilaianKktpPage.jsx'));
const DatabaseCleanupPage = lazy(() => import('./pages/DatabaseCleanupPage.jsx'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">Memuat halaman...</p>
    </div>
  </div>
);

function App() {
  // ... existing state and logic ...
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

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

    // Ensure welcome screen is visible for a premium duration to show off the UI
    // We use 3 seconds as the sweet spot for "WOW" without being annoying
    const timer = setTimeout(() => {
      setIsWelcomeVisible(false);
    }, 4000);

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
                <div className="animate-in fade-in zoom-in-95 duration-700 ease-out">
                  <Suspense fallback={<PageLoader />}>
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
                      <Route path="/portfolio" element={<PortfolioPage />} />
                      <Route path="/database-cleanup" element={<DatabaseCleanupPage />} />
                    </Routes>
                  </Suspense>
                </div>
              </DashboardLayout>
            ) : (
              <div className="animate-in fade-in duration-1000">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Suspense>
              </div>
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
