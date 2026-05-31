import React, { useState, useEffect, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary, { withErrorBoundary } from './components/ErrorBoundary';
import { ChatProvider } from './utils/ChatContext';
import { SettingsProvider } from './utils/SettingsContext';
import { AIProvider } from './utils/AIContext';
import { AuthProvider, useAuth } from './hooks/useAuth';
import InstallPwaCard from './components/InstallPwaCard';
import WelcomeScreen from './components/WelcomeScreen';
import './index.css';

// Lazy load pages for bundle optimization
const LoginPage = withErrorBoundary(lazy(() => import('./pages/LoginPage')));
const DashboardPage = withErrorBoundary(lazy(() => import('./pages/DashboardPage')));
const JadwalPage = withErrorBoundary(lazy(() => import('./pages/JadwalPage')));
const AbsensiPage = withErrorBoundary(lazy(() => import('./pages/AbsensiPage')));
const NilaiPage = withErrorBoundary(lazy(() => import('./pages/NilaiPage')));
const JurnalPage = withErrorBoundary(lazy(() => import('./pages/JurnalPage')));
const MasterDataPage = withErrorBoundary(lazy(() => import('./pages/MasterDataPage')));
const RekapitulasiPage = withErrorBoundary(lazy(() => import('./pages/RekapitulasiPage')));
const AboutPage = withErrorBoundary(lazy(() => import('./pages/AboutPage')));
const AsistenGuruPage = withErrorBoundary(lazy(() => import('./pages/AsistenGuruPage')));
const EarlyWarningPage = withErrorBoundary(lazy(() => import('./pages/EarlyWarningPage')));
const PelanggaranPage = withErrorBoundary(lazy(() => import('./pages/PelanggaranPage')));
const AnalisisKelasPage = withErrorBoundary(lazy(() => import('./pages/AnalisisKelasPage')));
const LeaderboardPage = withErrorBoundary(lazy(() => import('./pages/LeaderboardPage')));
const ProgramMengajarPage = withErrorBoundary(lazy(() => import('./pages/ProgramMengajarPage')));
const LessonPlanPage = withErrorBoundary(lazy(() => import('./pages/LessonPlanPage')));
const LkpdGeneratorPage = withErrorBoundary(lazy(() => import('./pages/LkpdGeneratorPage')));
const QuizGeneratorPage = withErrorBoundary(lazy(() => import('./pages/QuizGeneratorPage')));
const PenugasanPage = withErrorBoundary(lazy(() => import('./pages/PenugasanPage')));
const RekapIndividuPage = withErrorBoundary(lazy(() => import('./pages/RekapIndividuPage')));
const HandoutGeneratorPage = withErrorBoundary(lazy(() => import('./pages/HandoutGeneratorPage')));
const AssessmentKktpPage = withErrorBoundary(lazy(() => import('./pages/PenilaianKktpPage')));
const DatabaseCleanupPage = withErrorBoundary(lazy(() => import('./pages/DatabaseCleanupPage')));
const PortfolioPage = withErrorBoundary(lazy(() => import('./pages/PortfolioPage')));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">Memuat halaman...</p>
    </div>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();
  const [isWelcomeVisible, setIsWelcomeVisible] = useState<boolean>(true);
  const [authTimedOut, setAuthTimedOut] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCard, setShowInstallCard] = useState<boolean>(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);

  useEffect(() => {
    const checkPwaInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsPwaInstalled(isStandalone);
    };
    checkPwaInstalled();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsWelcomeVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      const isDismissed = sessionStorage.getItem('pwa_dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallCard(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstall = () => {
    const promptEvent = installPrompt || window.deferredPrompt;
    if (!promptEvent) {
      toast.error('Gagal memulai instalasi. Silakan cari menu "Install App" di browser Anda.');
      return;
    }

    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        toast.success('Aplikasi berhasil diinstal!');
      }
      setShowInstallCard(false);
      setInstallPrompt(null);
      window.deferredPrompt = null;
    });
  };

  const handleDismiss = () => {
    setShowInstallCard(false);
    sessionStorage.setItem('pwa_dismissed', 'true');
  };

  if (isWelcomeVisible || (loading && !user && !authTimedOut)) {
    return (
      <div className={!isWelcomeVisible ? 'animate-welcome-fade-out' : ''}>
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans transition-colors duration-200">
      <Toaster position="bottom-center" reverseOrder={false} />
      <SettingsProvider>
        <AIProvider>
          <ChatProvider>
            {user ? (
              <DashboardLayout>
                <div className="page-enter">
                  <ErrorBoundary>
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
                  </ErrorBoundary>
                </div>
              </DashboardLayout>
            ) : (
              <div className="animate-in fade-in duration-1000">
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {showInstallCard && (
              <InstallPwaCard
                onInstall={handleInstall}
                onDismiss={handleDismiss}
              />
            )}
          </ChatProvider>
        </AIProvider>
      </SettingsProvider>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;


