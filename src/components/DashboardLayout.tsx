import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { withTimeout } from '../utils/asyncUtils';
import CreateProfilePage from '../pages/CreateProfilePage';
import {
  Bell,
  Calendar,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
  FileText,
  User,
  Sun,
  Moon,
  Archive,
  Loader,
  Info,
  BarChart,
  Bot,
  Book,
  ShieldAlert,
  ShieldX,
  Trophy,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Zap,
  Edit3,
  ShieldCheck,
  PieChart,
  Settings2,
  Sparkles,
  BrainCircuit,
  ListTodo,
  WifiOff,
} from 'lucide-react';
import useDarkMode from '../hooks/useDarkMode';
import { formatDateTime } from '../utils/dateUtils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OfflineIndicator from './OfflineIndicator';
import { LocalNotifications } from '@capacitor/local-notifications';
import useTaskNotifications from '../hooks/useTaskNotifications';
import useScheduleNotifications from '../hooks/useScheduleNotifications';
import useJournalNotifications from '../hooks/useJournalNotifications';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../utils/SettingsContext';
import type { UserProfile } from '../types';

interface NavItemType {
  name: string;
  icon: React.ReactElement;
  path: string;
  shortName?: string;
}

interface NavCategoryType {
  title: string;
  icon: React.ReactElement;
  items: NavItemType[];
}

interface PendingNotification {
  id: number;
  title?: string;
  body?: string;
  schedule: { at: Date };
  extra?: Record<string, string>;
}

const NAV_CATEGORIES: NavCategoryType[] = [
  {
    title: 'Utama',
    icon: <Zap size={14} />,
    items: [
      { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
      { name: 'Asisten Guru', icon: <Bot size={20} />, path: '/asisten-guru' },
    ]
  },
  {
    title: 'Perencanaan',
    icon: <Edit3 size={14} />,
    items: [
      { name: 'Jadwal Mengajar', icon: <Calendar size={20} />, path: '/jadwal' },
      { name: 'Program Mengajar', icon: <BookOpen size={20} />, path: '/program-mengajar' },
      { name: 'Penyusunan RPP', icon: <Sparkles size={20} />, path: '/rpp' },
      { name: 'Generator LKPD', icon: <ClipboardList size={20} />, path: '/lkpd-generator' },
      { name: 'Generator Bahan Ajar', icon: <BookOpen size={20} />, path: '/handout-generator' },
      { name: 'Generator Soal', icon: <BrainCircuit size={20} />, path: '/quiz-generator' },
    ]
  },
  {
    title: 'Akademik',
    icon: <BookOpen size={14} />,
    items: [
      { name: 'Absensi Siswa', icon: <ClipboardList size={20} />, path: '/absensi' },
      { name: 'Jurnal Mengajar', icon: <FileText size={20} />, path: '/jurnal' },
      { name: 'Input Nilai', icon: <GraduationCap size={20} />, path: '/nilai' },
      { name: 'Penilaian KKTP', icon: <ClipboardCheck size={20} />, path: '/penilaian-kktp' },
      { name: 'Penugasan Siswa', icon: <ListTodo size={20} />, path: '/penugasan' },
    ]
  },
  {
    title: 'Poin Karakter',
    icon: <ShieldCheck size={14} />,
    items: [
      { name: 'Poin & Bintang', icon: <ShieldX size={20} />, path: '/pelanggaran' },
      { name: 'Leaderboard', icon: <Trophy size={20} />, path: '/leaderboard' },
    ]
  },
  {
    title: 'Analisis & Rekap',
    icon: <PieChart size={14} />,
    items: [
      { name: 'Rekapitulasi', icon: <Archive size={20} />, path: '/rekapitulasi' },
      { name: 'Rekap Individu', icon: <User size={20} />, path: '/rekap-individu' },
      { name: 'Analisis Kelas', icon: <ClipboardCheck size={20} />, path: '/analisis-kelas' },
      { name: 'Sistem Peringatan Dini', icon: <ShieldAlert size={20} />, path: '/sistem-peringatan' },
      { name: 'Portofolio & Audit', icon: <Book size={20} />, path: '/portfolio' },
    ]
  },
  {
    title: 'Sistem',
    icon: <Settings2 size={14} />,
    items: [
      { name: 'Master Data', icon: <Settings size={20} />, path: '/master-data' },
      { name: 'Tentang Aplikasi', icon: <Info size={20} />, path: '/about' },
    ]
  }
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 768;
    }
    return false;
  });
  const { isDark, toggle } = useDarkMode();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [unseenNotificationsCount, setUnseenNotificationsCount] = useState(0);
  const [profileStatus, setProfileStatus] = useState('loading');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSemester, academicYear } = useSettings();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useTaskNotifications(activeSemester, academicYear);
  useScheduleNotifications();
  useJournalNotifications();

  // Listener Klik Notifikasi
  useEffect(() => {
    const setupNotificationListener = async () => {
      const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const extra = notification.notification.extra;
        if (extra && extra.type === 'journal_reminder') {
          const { date, classId, subjectId } = extra;
          navigate(`/jurnal?date=${date}&classId=${classId}&subjectId=${subjectId}`);
        } else if (extra && extra.type === 'schedule') {
          navigate('/jadwal');
        } else if (extra && extra.type === 'task') {
          navigate('/penugasan');
        }
      });
      return listener;
    };

    const listenerPromise = setupNotificationListener();
    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [navigate]);

  // State untuk kategori yang diperluas
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>(() => {
    // Cari kategori yang berisi jalur saat ini untuk memperluasnya secara default
    const activeCategory = NAV_CATEGORIES.find(cat =>
      cat.items.some(item => item.path === location.pathname)
    );
    return activeCategory ? { [activeCategory.title]: true } : { 'Utama': true };
  });

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch {
      // Logout gagal
    }
  };

  useEffect(() => {
    const checkUserProfile = async () => {
      if (user && profileStatus === 'loading') {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await withTimeout(getDoc(userDocRef), 15000);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setProfileStatus('exists');
          } else {
            setProfileStatus('not_exists');
          }
        } catch (err) {
          console.error("Error checking profile:", err);
          setProfileStatus('not_exists');
        }
      }
    };
    checkUserProfile();
  }, [user, profileStatus]);

  useEffect(() => {
    const fetchAndSetUnseenNotifications = async () => {
      try {
        const { notifications } = await LocalNotifications.getPending();
        const seenNotificationIds = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
        const newUnseenNotifications = notifications.filter(n => !seenNotificationIds.includes(n.id.toString()));
        setUnseenNotificationsCount(newUnseenNotifications.length);
      } catch (error) {
        console.error("Error fetching notifications for unseen count:", error);
      }
    };

    fetchAndSetUnseenNotifications();
  }, []);

  const NavItem = ({ item, isMobile }: { item: NavItemType; isMobile: boolean }) => {
    const isActive = location.pathname === item.path;
    const showLabel = isMobile || isSidebarOpen;

    return (
      <Link
        to={item.path}
        onClick={() => {
          if (isMobile) setIsSidebarOpen(false);
        }}
        className={`flex items-center w-full gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group relative active:scale-95 ${isActive
          ? 'bg-primary/10 text-primary shadow-lg ring-1 ring-primary/20 scale-[1.02]'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white hover:scale-[1.02]'
          } ${!showLabel ? 'justify-center px-0' : ''}`}
        title={!showLabel ? item.name : ''}
      >
        <span className={`transition-all duration-500 ${isActive ? 'scale-125 rotate-6' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
          {React.cloneElement(item.icon, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
        </span>
        {showLabel && (
          <span className={`text-[13px] font-semibold tracking-tight transition-all duration-500 animate-in fade-in slide-in-from-left-2 ${isActive ? 'font-bold' : ''}`}>
            {item.name}
          </span>
        )}
        {isActive && showLabel && (
          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
        )}
      </Link>
    );
  };

  const footerNavItems = [
    { ...NAV_CATEGORIES[0].items[0], shortName: 'Dashboard' }, // Dasbor Utama
    { ...NAV_CATEGORIES[2].items[0], shortName: 'Absen' }, // Absensi Siswa
    { ...NAV_CATEGORIES[2].items[2], shortName: 'Nilai' }, // Input Nilai
    { ...NAV_CATEGORIES[2].items[1], shortName: 'Jurnal' }, // Jurnal Mengajar
    { ...NAV_CATEGORIES[0].items[1], shortName: 'Smartty' }  // Asisten Guru
  ].filter(Boolean);

  if (profileStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <Loader className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (profileStatus === 'not_exists') {
    return <CreateProfilePage onProfileCreated={() => setProfileStatus('exists')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans transition-colors duration-500">
      {/* Sidebar Desktop - Penyegaran Kaca Premium */}
       <aside
         className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-gray-100 dark:border-slate-800/50 shadow-2xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) hidden md:flex ${isSidebarOpen ? 'w-72' : 'w-24'}`}
       >
         <div className={`flex flex-col px-4 py-3 border-b border-gray-100 dark:border-gray-800/50 transition-all duration-300`}>
           <div className={`flex items-center justify-between gap-3 mb-2 ${isSidebarOpen ? '' : 'flex-col justify-center'}`}>
             <div className="flex items-center gap-3">
               <div className="shrink-0 glass-icon-container glass-glow-blue w-12 h-12 p-1 relative overflow-visible">
                 <img src="/Logo Smart Teaching 3D.png" alt="Logo" className="h-full w-auto object-contain drop-shadow-xl" />
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none rounded-2xl"></div>
               </div>
               {isSidebarOpen && (
                 <div className="flex flex-col animate-in fade-in duration-500">
                   <h1 className="font-sans text-lg font-black text-primary tracking-tight leading-none">Smart</h1>
                   <h1 className="font-sans text-lg font-black text-gray-800 dark:text-white tracking-tight leading-none">Teaching</h1>
                 </div>
               )}
             </div>
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/10 hover:text-primary transition-all duration-300 text-gray-400 ${!isSidebarOpen ? 'rotate-180' : ''}`}
             >
               <ChevronRight size={18} />
             </button>
           </div>
           {isSidebarOpen && (
             <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-tight leading-tight text-left animate-in fade-in duration-500 pl-15">Empowering Teachers with Intelligence</p>
           )}
         </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {NAV_CATEGORIES.map((category, idx) => {
            const isExpanded = expandedCategories[category.title];
            const hasActiveItem = category.items.some(item => item.path === location.pathname);

            return (
              <div key={category.title} className={idx > 0 ? 'mt-4' : ''}>
                <button
                  onClick={() => toggleCategory(category.title)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 mb-1 text-[11px] font-black uppercase tracking-[0.18em] transition-all duration-300 rounded-xl group ${hasActiveItem
                    ? 'text-primary bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/5'
                    } ${!isSidebarOpen ? 'justify-center' : ''}`}
                  title={!isSidebarOpen ? category.title : ''}
                >
                  <div className="flex items-center gap-3">
                    <span className={`transition-all duration-300 ${isExpanded ? 'scale-110 opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                      {category.icon}
                    </span>
                    {isSidebarOpen && <span className="animate-in fade-in slide-in-from-left-1 duration-300">{category.title}</span>}
                  </div>
                  {isSidebarOpen && (
                    <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'opacity-40'}`}>
                      <ChevronDown size={14} />
                    </div>
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <ul className="space-y-1.5 ml-2.5 pl-2 border-l-2 border-primary/10 dark:border-primary/5">
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <NavItem item={item} isMobile={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>
        <div className={`mt-auto px-4 pb-3 transition-all duration-300 ${isSidebarOpen ? '' : 'px-2'}`}>
          <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'p-3' : 'p-2 flex flex-col items-center'}`}>
            <div className={`flex items-center gap-3 ${isSidebarOpen ? 'mb-3' : 'mb-2'}`}>
              <div className="relative group/avatar">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 p-[2px] transition-transform duration-300 group-hover/avatar:scale-110">
                  <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User size={20} className="text-primary" />
                    )}
                  </div>
                </div>
                {isSidebarOpen && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              {isSidebarOpen && (
                <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2">
                  <p className="truncate text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-none mb-1">
                    {userProfile?.name?.split(' ')[0] || user?.email?.split('@')[0]}
                  </p>
                  <p className="truncate text-[10px] font-bold text-primary uppercase tracking-widest opacity-70">Guru {userProfile?.schoolLevel || 'Cerdas'}</p>
                </div>
              )}
            </div>
            <div className={`grid gap-2 ${isSidebarOpen ? 'grid-cols-2' : 'grid-cols-1 w-full'}`}>
              <button
                onClick={() => navigate('/master-data')}
                className="flex items-center justify-center p-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all text-gray-500 hover:text-primary active:scale-95"
                title="Profil & Pengaturan"
              >
                <Settings2 size={16} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-red-500 active:scale-95"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
            {isSidebarOpen && (
              <div className="mt-3 pt-2 text-center border-t border-gray-200/50 dark:border-gray-700/50 animate-in fade-in duration-500">
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500">© Ririyami, S.Kom</p>
                <p className="text-[8px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-none mt-0.5">build version 2.03j</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Bagian Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-3 md:p-4 border-b border-gray-100 dark:border-gray-800/50 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'md:left-72' : 'md:left-24'}`}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 mr-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 flex-shrink-0">
            <Menu size={24} />
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:gap-3 min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark line-clamp-2 md:line-clamp-none leading-tight md:leading-normal">
              {NAV_CATEGORIES.flatMap(c => c.items).find((item) => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-400 dark:text-gray-500 rounded-full border border-gray-200/50 dark:border-gray-700/50 whitespace-nowrap">
              v2.03j
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {isOffline && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-lg animate-pulse">
              <WifiOff size={16} />
              <span className="text-[10px] font-bold uppercase hidden sm:inline">Offline</span>
            </div>
          )}
          <button onClick={toggle} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <div className="relative">
            <button
              onClick={async () => {
                if (showNotificationsDropdown) {
                  setShowNotificationsDropdown(false);
                  // Batalkan semua notifikasi yang ditampilkan saat menutup dropdown
                  if (pendingNotifications.length > 0) {
                    await LocalNotifications.cancel({ notifications: pendingNotifications.map(n => ({ id: n.id })) });
                  }
                  setPendingNotifications([]);
                } else {
                  try {
                    const { notifications } = await LocalNotifications.getPending();
                    setPendingNotifications(notifications as unknown as PendingNotification[]);
                    const notificationIds = notifications.map(n => n.id.toString());
                    localStorage.setItem('seenNotifications', JSON.stringify(notificationIds));
                    setUnseenNotificationsCount(0);
                    setShowNotificationsDropdown(true);
                  } catch (error) {
                    console.error("Error handling notifications:", error);
                  }
                }
              }}
              className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Bell size={24} />
              {unseenNotificationsCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-md bg-surface-light dark:bg-surface-dark shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-text-light dark:text-text-dark border-b border-gray-200 dark:border-gray-700">Notifikasi</h3>
                  {pendingNotifications.length > 0 ? (
                    pendingNotifications.map((notification, index) => (
                      <div key={notification.id || index} className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        <p className="font-medium text-text-light dark:text-text-dark">{notification.title}</p>
                        <p>{notification.body}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(notification.schedule.at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark">Tidak ada notifikasi tertunda.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* User Profile and Dropdown */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 focus:outline-none"
            >
              <p className="hidden sm:block truncate text-sm font-semibold text-text-light dark:text-text-dark">{userProfile?.name || user?.email}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User size={20} className="text-primary dark:text-primary-300" />
                )}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-md bg-surface-light dark:bg-surface-dark shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 dark:hover:text-white"
                    role="menuitem"
                  >
                    <LogOut size={16} className="mr-2" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with Entry Animation */}
      <main className={`flex-1 pt-24 transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-24'} ${location.pathname === '/asisten-guru' ? 'pb-16 md:pb-0' : 'pb-32 md:pb-10'} overflow-y-auto`}>
        <div key={location.pathname} className={`w-full animate-fade-in-up ${location.pathname === '/asisten-guru' ? '' : 'p-4 md:p-10'}`}>
          <div className={location.pathname === '/asisten-guru' ? '' : 'max-w-[1400px] mx-auto w-full'}>
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Premium Glassmorphic Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16 px-2">
          {footerNavItems.map((item: NavItemType) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex-1 flex flex-col items-center justify-center h-full transition-all duration-500 ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}
              >
                {/* Active Indicator Glow */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-in fade-in zoom-in duration-700"></div>
                )}

                <div className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 ${isActive ? 'scale-110' : 'active:scale-90 hover:scale-105'}`}>
                  <div className={`p-2 rounded-xl transition-all duration-500 relative ${isActive ? 'glass-icon-container glass-glow-blue scale-110 shadow-lg' : ''}`}>
                    {React.cloneElement(item.icon, {
                      size: 22,
                      strokeWidth: isActive ? 2.5 : 2,
                      className: isActive ? 'opacity-90' : 'opacity-60'
                    })}
                    {isActive && <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none rounded-xl"></div>}
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-tight text-center transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0.5' : 'opacity-60'}`}>
                    {item.shortName || item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Sidebar (Off-canvas) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-light dark:bg-surface-dark p-4 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="mb-6 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="glass-icon-container glass-glow-blue w-10 h-10 p-1 relative">
              <img src="/Logo Smart Teaching 3D.png" alt="Logo" className="h-full w-auto object-contain" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none rounded-xl"></div>
            </div>
            <h1 className="font-sans text-lg font-extrabold text-blue-600 dark:text-blue-500 tracking-tight">Smart Teaching</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {NAV_CATEGORIES.map((category, idx) => {
            const isExpanded = expandedCategories[category.title];
            const hasActiveItem = category.items.some(item => item.path === location.pathname);

            return (
              <div key={category.title} className={idx > 0 ? 'mt-4' : ''}>
                <button
                  onClick={() => toggleCategory(category.title)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 mb-1 text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 group ${hasActiveItem ? 'text-primary bg-primary/5 dark:bg-primary/10' : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`transition-transform duration-300 ${isExpanded ? 'scale-110' : 'opacity-70'}`}>
                      {category.icon}
                    </span>
                    <span>{category.title}</span>
                  </div>
                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <ul className="space-y-1.5 ml-2.5 pl-2 border-l-2 border-primary/10 dark:border-primary/5">
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <NavItem item={item} isMobile />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
      <OfflineIndicator />
    </div>
  );
}
