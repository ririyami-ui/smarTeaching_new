import React from 'react';
const { useState, useEffect, useCallback, useMemo, useRef } = React;
import { useSettings } from '../utils/SettingsContext';
import { generateATP } from '../utils/gemini';
import { BookOpen, Calendar, List, Clock, Save, ChevronDown, Check, Trash, Upload, Download, FileSpreadsheet, Plus, Zap, RefreshCw, MapPin, Loader2, Workflow, Lock, Unlock } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/id';
import { db, auth } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, deleteField } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Printer, FileText, Copy } from 'lucide-react';
import Modal from '../components/Modal';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import { exportToDocx } from '../utils/teachingPlanUtils';
import PekanEfektifView from '../components/teaching-plan/PekanEfektifView';
import ProtaView from '../components/teaching-plan/ProtaView';
import PromesView from '../components/teaching-plan/PromesView';
import ATPView from '../components/teaching-plan/ATPView';



const ProgramMengajarPage = () => {
    const { activeSemester, academicYear, schoolDays, activeTemplateId } = useSettings();
    const [activeTab, setActiveTab] = useState('pekan-efektif');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [levels, setLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [schedules, setSchedules] = useState([]);

    const [userProfile, setUserProfile] = useState(null);
    const [signingLocation, setSigningLocation] = useState('');
    const [detectingLocation, setDetectingLocation] = useState(false);

    const handleDetectLocation = useCallback((manual = true) => {
        if (!navigator.geolocation) {
            if (manual) toast.error("Browser tidak mendukung geolokasi.");
            return;
        }

        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    let city = data.address.city || data.address.town || data.address.regency || data.address.county || data.address.state_district || 'Lokasi Terdeteksi';

                    // Cleanup common prefixes in Indonesia
                    city = city.replace(/^(Kabupaten|Kota|Kab\.|Kota\s)\s+/i, '');

                    // Race condition fix: If auto-detecting (manual=false), check if we already have a high-confidence location set (e.g. from School Name)
                    if (!manual) {
                        const currentParams = localStorage.getItem('QUIZ_SIGNING_LOCATION');
                        if (currentParams && currentParams !== 'Jakarta' && currentParams !== 'Lokasi Terdeteksi' && currentParams !== '') {

                            setDetectingLocation(false);
                            return;
                        }
                    }

                    setSigningLocation(city);
                    localStorage.setItem('QUIZ_SIGNING_LOCATION', city);
                    if (manual) toast.success(`Lokasi terdeteksi: ${city}`);
                } catch (error) {
                    if (manual) {
                        console.error("Error detecting location:", error);
                        if (error.code === 1) toast.error("Izin lokasi ditolak.");
                        else toast.error("Gagal mendeteksi nama kota.");
                    }
                } finally {
                    setDetectingLocation(false);
                }
            },
            (error) => {
                if (manual) {
                    console.error("Geolocation error:", error);
                    if (error.code === 1) toast.error("Izin lokasi ditolak. Mohon izinkan browser.");
                    else toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
                }
                setDetectingLocation(false);
            }
        );
    }, []);

    // Load saved location on mount or detect automatically
    useEffect(() => {
        const savedLoc = localStorage.getItem('QUIZ_SIGNING_LOCATION');
        if (savedLoc) {
            setSigningLocation(savedLoc);
        } else {
            handleDetectLocation(false); // Auto-detect, silent errors
        }
    }, [handleDetectLocation]);

    // Fetch unique levels and subjects from master data
    useEffect(() => {
        const fetchMasterData = async (user) => {
            if (!user) {
                setLevels([]);
                setSubjects([]);
                setLoadingData(false);
                return;
            }

            setLoadingData(true);
            try {
                // Fetch Levels from 'classes'
                const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
                const classesSnapshot = await getDocs(classesQuery);
                const uniqueLevels = [...new Set(classesSnapshot.docs.map(doc => doc.data().level))].sort();
                setLevels(uniqueLevels);
                if (uniqueLevels.length > 0) setSelectedGrade(uniqueLevels[0]);

                // Fetch Subjects from 'subjects'
                const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));
                const subjectsSnapshot = await getDocs(subjectsQuery);
                const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name));
                setSubjects(fetchedSubjects);
                if (fetchedSubjects.length > 0) setSelectedSubject(fetchedSubjects[0].name);

                // Fetch User Profile for school name
                const userDocRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const profile = userSnap.data();
                    setUserProfile(profile);

                    // FORCE set location from School Name if available
                    // This takes precedence over GPS or LocalStorage logic for official documents
                    if (profile.school || profile.schoolName) {
                        const school = profile.school || profile.schoolName;
                        const parts = school.trim().split(' ');

                        // Heuristic: Last word is usually the city (e.g. "SMPN 7 Bondowoso")
                        if (parts.length > 1) {
                            const lastWord = parts[parts.length - 1];
                            // Basic validation: Avoid small words like 1, I, V, or 'Negeri', 'Swasta' at end
                            const ignoreWords = ['negeri', 'swasta', 'pusat', 'terpadu', 'utara', 'selatan', 'barat', 'timur', 'tengah'];

                            if (lastWord.length > 2 && !ignoreWords.includes(lastWord.toLowerCase()) && isNaN(lastWord)) {
                                setSigningLocation(lastWord);
                                localStorage.setItem('QUIZ_SIGNING_LOCATION', lastWord);
                                return; // Stop here, don't use the fallback logic below
                            }
                        }
                    }

                    // Fallback to existing logic if school parsing failed
                    setSigningLocation(prev => {
                        if (prev && prev !== 'Jakarta') return prev;
                        const stored = localStorage.getItem('QUIZ_SIGNING_LOCATION');
                        return stored || 'Jakarta';
                    });
                }

            } catch (err) {
                console.error("Error fetching master data:", err);
                toast.error("Gagal memuat data master.");
            } finally {
                setLoadingData(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(fetchMasterData);
        return () => unsubscribe();
    }, []);

    // Fetch Teaching Schedules
    useEffect(() => {
        const fetchSchedules = async (user) => {
            if (!user || !activeTemplateId) {
                setSchedules([]);
                return;
            }
            try {
                const q = query(
                    collection(db, 'teachingSchedules'),
                    where('userId', '==', user.uid),
                    where('templateId', '==', activeTemplateId)
                );
                const snapshot = await getDocs(q);
                setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching schedules:", error);
            }
        };
        const unsubscribe = auth.onAuthStateChanged(fetchSchedules);
        return () => unsubscribe();
    }, [activeTemplateId]);

    // Tabs configuration
    const tabs = [
        { id: 'pekan-efektif', label: 'Pekan Efektif', icon: <Clock size={18} /> },
        { id: 'atp', label: 'Alur Tujuan (ATP)', icon: <Workflow size={18} /> },
        { id: 'prota', label: 'Program Tahunan', icon: <List size={18} /> },
        { id: 'promes', label: 'Program Semester', icon: <Calendar size={18} /> },
    ];

    const [sharedEfektifData, setSharedEfektifData] = useState(null);

    // BREAK LOOP: Stable update function
    const handleUpdateGlobalEfektif = useCallback((newData) => {
        setSharedEfektifData(prev => {
            if (!newData) return null;
            // Deep compare to avoid unnecessary re-renders
            if (prev &&
                prev.jpPerWeek === newData.jpPerWeek &&
                prev.totalEffectiveWeeks === newData.totalEffectiveWeeks &&
                JSON.stringify(prev.pekanEfektif) === JSON.stringify(newData.pekanEfektif)) {
                return prev;
            }
            return newData;
        });
    }, []);

    // GLOBAL FETCH: Load Pekan Efektif & JP Context immediately on selection
    useEffect(() => {
        if (!auth.currentUser || !selectedGrade || !selectedSubject) return;

        let ignore = false;
        const fetchGlobalEfektif = async () => {
            // Reset to prevent stale flicker
            setSharedEfektifData(null);

            try {
                const cId = `calendar_${auth.currentUser.uid}_${selectedGrade}_${academicYear.replace('/', '-')}_${activeSemester}`;
                const cIdOld = `calendar_${auth.currentUser.uid}_${academicYear.replace('/', '-')}_${activeSemester}`;
                const pId = `${auth.currentUser.uid}_${selectedSubject}_${selectedGrade}_${academicYear.replace('/', '-')}_${activeSemester}`;

                const calRef = doc(db, 'teachingPrograms', cId);
                const calRefOld = doc(db, 'teachingPrograms', cIdOld);
                const progRef = doc(db, 'teachingPrograms', pId);

                const [calSnap, calSnapOld, progSnap] = await Promise.all([
                    getDoc(calRef),
                    getDoc(calRefOld),
                    getDoc(progRef)
                ]);

                if (ignore) return;

                let effectiveMonths = [];
                if (calSnap.exists() && calSnap.data().pekanEfektif) {
                    effectiveMonths = calSnap.data().pekanEfektif;
                } else if (calSnapOld.exists() && calSnapOld.data().pekanEfektif) {
                    effectiveMonths = calSnapOld.data().pekanEfektif;
                } else if (progSnap.exists() && progSnap.data().pekanEfektif) {
                    effectiveMonths = progSnap.data().pekanEfektif;
                }

                const jpPerWeek = progSnap.exists() ? (progSnap.data().jpPerWeek || 0) : 0;

                if (effectiveMonths.length > 0) {
                    const totalWeeks = effectiveMonths.reduce((acc, curr) =>
                        acc + (parseInt(curr.totalWeeks || 0) - parseInt(curr.nonEffectiveWeeks || 0)), 0);

                    setSharedEfektifData({
                        totalEffectiveWeeks: totalWeeks,
                        totalEffectiveHours: totalWeeks * parseInt(jpPerWeek),
                        jpPerWeek: parseInt(jpPerWeek),
                        pekanEfektif: effectiveMonths
                    });
                } else {
                    setSharedEfektifData({
                        totalEffectiveWeeks: 0,
                        totalEffectiveHours: 0,
                        jpPerWeek: parseInt(jpPerWeek),
                        pekanEfektif: []
                    });
                }
            } catch (error) {
                console.error("Error in Global Efektif Fetch:", error);
            }
        };

        fetchGlobalEfektif();
        return () => { ignore = true; };
    }, [selectedGrade, selectedSubject, activeSemester, academicYear]);

    return (
        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header ... (unchanged) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="text-blue-600" />
                        Program Mengajar
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Tahun Ajaran {academicYear} • Semester {activeSemester}
                    </p>

                </div>
                {/* ... Rest of header code unused in this block, keeping context ... */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Location Selector */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <MapPin size={14} className="text-gray-500" />
                        <input
                            type="text"
                            className="bg-transparent font-semibold text-gray-800 dark:text-white focus:outline-none text-sm w-32"
                            value={signingLocation}
                            onChange={(e) => {
                                setSigningLocation(e.target.value);
                                localStorage.setItem('QUIZ_SIGNING_LOCATION', e.target.value);
                            }}
                            placeholder="Kota..."
                        />
                        <button
                            onClick={handleDetectLocation}
                            disabled={detectingLocation}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Deteksi Lokasi"
                        >
                            {detectingLocation ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        </button>
                    </div>
                    {/* Subject Selector */}
                    <div className="flex flex-1 items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-2">Mapel:</span>
                        <select
                            value={selectedSubject}
                            onChange={(e) => {
                                setSelectedSubject(e.target.value);
                                setSharedEfektifData(null);
                            }}
                            className="flex-1 bg-transparent font-semibold text-gray-800 dark:text-white focus:outline-none cursor-pointer text-sm"
                            disabled={loadingData}
                        >
                            {loadingData ? (
                                <option>Memuat...</option>
                            ) : (
                                subjects.length > 0 ? (
                                    subjects.map((sub) => (
                                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                                    ))
                                ) : (
                                    <option disabled>Tidak ada mapel</option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Grade Selector */}
                    <div className="flex flex-1 items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-2">Tingkat:</span>
                        <select
                            value={selectedGrade}
                            onChange={(e) => {
                                setSelectedGrade(e.target.value);
                                setSharedEfektifData(null);
                            }}
                            className="flex-1 bg-transparent font-semibold text-gray-800 dark:text-white focus:outline-none cursor-pointer text-sm"
                            disabled={loadingData}
                        >
                            {loadingData ? (
                                <option>Memuat...</option>
                            ) : (
                                levels.length > 0 ? (
                                    levels.map((lvl) => (
                                        <option key={lvl} value={lvl}>Kelas {lvl}</option>
                                    ))
                                ) : (
                                    <option disabled>Tidak ada tingkat</option>
                                )
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-1 justify-center ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div id="printable-area" className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px] p-6">
                {!selectedGrade || !selectedSubject ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p>Silakan pilih mata pelajaran dan tingkat kelas terlebih dahulu</p>
                    </div>
                ) : (
                    <>
                        <>
                            {activeTab === 'atp' && (
                                <ATPView
                                    key={`atp_${selectedGrade}_${selectedSubject}_${activeSemester}_${academicYear}`}
                                    grade={selectedGrade}
                                    subject={selectedSubject}
                                    semester={activeSemester}
                                    year={academicYear}
                                    userProfile={userProfile}
                                    signingLocation={signingLocation}
                                    schedules={schedules}
                                    sharedEfektifData={sharedEfektifData} // Pass shared data
                                    subjects={subjects}
                                />
                            )}
                            {activeTab === 'pekan-efektif' && (
                                <PekanEfektifView
                                    key={`cal_${selectedGrade}_${selectedSubject}_${activeSemester}_${academicYear}`}
                                    grade={selectedGrade}
                                    subject={selectedSubject}
                                    semester={activeSemester}
                                    year={academicYear}
                                    schedules={schedules}
                                    activeTab={activeTab}
                                    userProfile={userProfile}
                                    signingLocation={signingLocation}
                                    onUpdateData={handleUpdateGlobalEfektif}
                                    sharedEfektifData={sharedEfektifData}
                                    subjects={subjects}
                                    levels={levels}
                                    schoolDays={schoolDays}
                                />
                            )}
                            {activeTab === 'prota' && (
                                <ProtaView
                                    key={`prota_${selectedGrade}_${selectedSubject}_${activeSemester}_${academicYear}`}
                                    grade={selectedGrade}
                                    subject={selectedSubject}
                                    semester={activeSemester}
                                    year={academicYear}
                                    activeTab={activeTab}
                                    userProfile={userProfile}
                                    signingLocation={signingLocation}
                                    sharedEfektifData={sharedEfektifData}
                                    subjects={subjects}
                                />
                            )}
                            {activeTab === 'promes' && (
                                <PromesView
                                    key={`promes_${selectedGrade}_${selectedSubject}_${activeSemester}_${academicYear}`}
                                    grade={selectedGrade}
                                    subject={selectedSubject}
                                    semester={activeSemester}
                                    year={academicYear}
                                    schedules={schedules}
                                    activeTab={activeTab}
                                    userProfile={userProfile}
                                    signingLocation={signingLocation}
                                    sharedEfektifData={sharedEfektifData}
                                    subjects={subjects}
                                    schoolDays={schoolDays}
                                />
                            )}
                        </>
                    </>
                )}
            </div>
        </div>
    );
};









export default ProgramMengajarPage;