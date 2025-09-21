import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
  Bot, // Import Bot icon
  ShieldAlert, // Import ShieldAlert icon
  ShieldX,
} from 'lucide-react';
import useDarkMode from '../hooks/useDarkMode';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function DashboardLayout({ children, user }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [colorTheme, setTheme] = useDarkMode();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [profileStatus, setProfileStatus] = useState('loading');
  const [userProfile, setUserProfile] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const checkUserProfile = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
          setProfileStatus('exists');
        } else {
          setProfileStatus('not_exists');
        }
      }
    };
    checkUserProfile();
  }, [user, profileStatus]);

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Jadwal Mengajar', icon: <Calendar size={20} />, path: '/jadwal' },
    { name: 'Absensi Siswa', icon: <ClipboardList size={20} />, path: '/absensi' },
    { name: 'Input Nilai', icon: <GraduationCap size={20} />, path: '/nilai' },
    { name: 'Jurnal Mengajar', icon: <FileText size={20} />, path: '/jurnal' },
    { name: 'Catatan Pelanggaran', icon: <ShieldX size={20} />, path: '/pelanggaran' },
    { name: 'Rekapitulasi', icon: <Archive size={20} />, path: '/rekapitulasi' },
    { name: 'Analisis Siswa', icon: <BarChart size={20} />, path: '/analisis-siswa' },
    { name: 'Analisis Kelas', icon: <ClipboardCheck size={20} />, path: '/analisis-kelas' },
    { name: 'Sistem Peringatan Dini', icon: <ShieldAlert size={20} />, path: '/sistem-peringatan' },
    { name: 'Asisten Guru', icon: <Bot size={20} />, path: '/asisten-guru' },
    { name: 'Master Data', icon: <Settings size={20} />, path: '/master-data' },
    { name: 'Tentang Aplikasi', icon: <Info size={20} />, path: '/about' },
  ];

  const NavItem = ({ item, isMobile }) => (
    <Link
      to={item.path}
      onClick={() => {
        if (isMobile) setIsSidebarOpen(false);
      }}
      className={`flex items-center w-full gap-3 p-3 rounded-lg transition-colors duration-200 ${
        location.pathname === item.path
          ? 'bg-primary text-white shadow-lg'
          : 'text-text-muted-light dark:text-text-muted-dark hover:bg-primary-50 dark:hover:bg-surface-dark hover:text-primary'
      }`}
    >
      {item.icon}
      <span className="font-semibold">{item.name}</span>
    </Link>
  );

  const footerNavItems = [
    navItems.find(item => item.path === '/'), // Dashboard
    navItems.find(item => item.path === '/absensi'), // Absensi Siswa
    navItems.find(item => item.path === '/nilai'), // Input Nilai
    navItems.find(item => item.path === '/jurnal'), // Jurnal Mengajar
    navItems.find(item => item.path === '/asisten-guru') // Asisten Guru
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-surface-light dark:bg-surface-dark p-4 shadow-2xl md:flex">
        <div className="mb-8 flex flex-col items-center justify-center p-4">
          <img src="/Logo Smart Teaching Baru_.png" alt="Logo" className="h-16" />
          <h1 className="mt-4 font-sans text-2xl font-bold text-blue-600 drop-shadow-lg">Smart Teaching</h1>
        </div>
        <nav className="flex-1 h-full overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavItem item={item} isMobile />
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User Avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={20} className="text-primary dark:text-primary-300" />
              )}
            </div>
            <p className="truncate text-sm font-medium text-text-light dark:text-text-dark">{userProfile?.name || user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-red-500 transition-colors duration-200 hover:bg-red-100 dark:hover:bg-red-900/50 dark:hover:text-white"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-lg p-4 shadow-sm md:left-64">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">
            {navItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setTheme(colorTheme)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            {colorTheme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <div className="relative">
            <button
              onClick={async () => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (!showNotificationsDropdown) {
                  try {
                    const { notifications } = await LocalNotifications.getPending();
                    console.log("Pending notifications:", notifications);
                    setPendingNotifications(notifications);
                  } catch (error) {
                    console.error("Error fetching pending notifications:", error);
                  }
                }
              }}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Bell size={24} />
            </button>
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-md bg-surface-light dark:bg-surface-dark shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-text-light dark:text-text-dark border-b border-gray-200 dark:border-gray-700">Notifikasi</h3>
                  {pendingNotifications.length > 0 ? (
                    pendingNotifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        <p className="font-medium text-text-light dark:text-text-dark">{notification.title}</p>
                        <p>{notification.body}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notification.schedule.at).toLocaleString()}
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

      {/* Main Content */}
      <main className="md:ml-64 pt-20 pb-20 md:pb-6">
        <div className={`w-full ${location.pathname === '/asisten-guru' ? '' : 'p-6'} overflow-x-auto`}>{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 flex justify-around p-2">
        {footerNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 p-2 rounded-lg transition-colors duration-200 ${
              location.pathname === item.path ? 'text-primary' : 'text-text-muted-light dark:text-text-muted-dark'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium text-center">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile Sidebar (Off-canvas) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-light dark:bg-surface-dark p-4 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between p-4">
            <div className="flex items-center">
                <img src="/Logo Smart Teaching Baru_.png" alt="Logo" className="h-12" />
                <h1 className="ml-4 font-sans text-xl font-bold text-blue-600 drop-shadow-lg">Smart Teaching</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavItem item={item} isMobile />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}