import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, RefreshCw, Loader2, Calendar, BookOpen, Award, ShieldAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { useSettings } from '../utils/SettingsContext';
import { getSignatureCity } from '../utils/generalUtils';
import StyledButton from '../components/StyledButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

// Modular Tab Components
import RekapAttendanceTab from '../components/RekapAttendanceTab';
import RekapJournalTab from '../components/RekapJournalTab';
import RekapGradeTab from '../components/RekapGradeTab';
import RekapViolationTab from '../components/RekapViolationTab';

const RekapitulasiPage = () => {
  const { user } = useAuth();
  const { academicWeight: globalAcademicWeight, attitudeWeight: globalAttitudeWeight, activeSemester, academicYear } = useSettings();
  const [activeTab, setActiveTab] = useState('kehadiran');

  // General State
  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Signing Location State
  const [signingLocation, setSigningLocation] = useState<string>(() => localStorage.getItem('SIGNING_LOCATION') || 'Jakarta');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUserProfile(profileData);
            setSchoolName(profileData.schoolName || '');
            setTeacherName(profileData.name || user.email);
            setSigningLocation(getSignatureCity(profileData));
          }

          const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
          const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));

          const [classesSnapshot, subjectsSnapshot] = await Promise.all([
            getDocs(classesQuery),
            getDocs(subjectsQuery)
          ]);

          setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>)).sort((a, b) => (a.rombel as string || '').localeCompare(b.rombel as string || '')));
          setSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>)).sort((a, b) => (a.name as string || '').localeCompare(b.name as string || '')));
        } catch (error) {
          console.error("Error fetching initial data:", error);
          toast.error("Gagal memuat data awal.");
        } finally {
          setIsInitialLoading(false);
        }
      } else {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini.");
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.county || "Jakarta";
          const cleanCity = city.replace(/Kota\s|Regency\s/gi, "");
          setSigningLocation(cleanCity);
          localStorage.setItem('SIGNING_LOCATION', cleanCity);
          toast.success(`Lokasi terdeteksi: ${cleanCity}`);
        } catch {
          toast.error("Gagal mendeteksi nama kota.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        toast.error("Gagal mendapatkan izin lokasi.");
        setIsDetectingLocation(false);
      }
    );
  };

  const renderTabButton = (id: string, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === id
        ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
        : 'bg-white dark:bg-surface-dark text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Menyiapkan data rekapitulasi..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            Rekapitulasi
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-bold">PRO</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Pusat data dan analisis progress pembelajaran</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-white dark:bg-surface-dark p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{signingLocation}</span>
            </div>
            <StyledButton
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="!py-1.5 !px-3 !text-xs whitespace-nowrap"
            >
              {isDetectingLocation ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Update Lokasi'
              )}
            </StyledButton>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3 pb-2 overflow-x-auto scrollbar-hide">
        {renderTabButton('kehadiran', 'Kehadiran', <Users className="w-5 h-5" />)}
        {renderTabButton('jurnal', 'Jurnal', <BookOpen className="w-5 h-5" />)}
        {renderTabButton('nilai', 'Nilai', <Award className="w-5 h-5" />)}
        {renderTabButton('pelanggaran', 'Pelanggaran', <ShieldAlert className="w-5 h-5" />)}
      </div>

      {/* Dynamic Tab Content */}
      <div className="mt-8 transition-all duration-500">
        {activeTab === 'kehadiran' && (
          <RekapAttendanceTab
            classes={classes as unknown as { id: string; rombel: string }[]}
            subjects={subjects as unknown as { id: string; name: string }[]}
            userProfile={userProfile as unknown as import('../types').UserProfile}
            schoolName={schoolName}
            teacherName={teacherName}
            activeSemester={activeSemester}
            academicYear={academicYear}
          />
        )}

        {activeTab === 'jurnal' && (
          <RekapJournalTab
            classes={classes as unknown as { id: string; rombel: string }[]}
            subjects={subjects as unknown as { id: string; name: string }[]}
            teacherName={teacherName}
            userProfile={userProfile as unknown as import('../types').UserProfile}
          />
        )}

        {activeTab === 'nilai' && (
          <RekapGradeTab
            classes={classes as unknown as { id: string; rombel: string }[]}
            subjects={subjects as unknown as { id: string; name: string }[]}
            userProfile={userProfile as unknown as import('../types').UserProfile}
            schoolName={schoolName}
            teacherName={teacherName}
            globalAcademicWeight={globalAcademicWeight}
            globalAttitudeWeight={globalAttitudeWeight}
          />
        )}

        {activeTab === 'pelanggaran' && (
          <RekapViolationTab
            classes={classes as unknown as { id: string; rombel: string }[]}
            subjects={subjects as unknown as { id: string; name: string }[]}
            schoolName={schoolName}
            teacherName={teacherName}
            userProfile={userProfile as unknown as import('../types').UserProfile}
          />
        )}
      </div>
    </div>
  );
};

export default RekapitulasiPage;


