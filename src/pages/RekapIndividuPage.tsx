import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { runEarlyWarningAnalysis } from '../utils/analysis';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import moment from 'moment';
import 'moment/locale/id';
import {
    Download,
    FileText,
    MessageCircle,
    X,
    Check,
    Copy
} from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import html2canvas from 'html2canvas';
import { generateStudentIndividualRecapPDF } from '../utils/pdfGenerator';
import { generateStudentNarrative, generateParentMessage } from '../utils/gemini';
import { getSignatureCity } from '../utils/generalUtils';

// Import Modular Components
import StudentSelectionHeader from '../components/StudentSelectionHeader';
import StudentEmptyState from '../components/StudentEmptyState';
import StudentStatsOverview from '../components/StudentStatsOverview';
import StudentRadarProfile from '../components/StudentRadarProfile';
import StudentAcademicDetail from '../components/StudentAcademicDetail';
import StudentAttendanceDetail from '../components/StudentAttendanceDetail';
import StudentInfractionDetail from '../components/StudentInfractionDetail';
import StudentAppreciationDetail from '../components/StudentAppreciationDetail';
import StudentNarrativeSection from '../components/StudentNarrativeSection';

import { Student, Grade, AttendanceRecord, Infraction, Appreciation, StudentStats, ClassAgreement } from '../types/studentTypes';

// Set global locale for moment
moment.locale('id');

// Helper function for attitude predicate
const getAttitudePredicate = (score: number) => {
    if (score >= 91) return 'Sangat Baik';
    if (score >= 81) return 'Baik';
    if (score >= 71) return 'Cukup';
    return 'Kurang';
};

const RekapIndividuPage: React.FC = () => {
    const { user } = useAuth();
    const hasCleanedUpRef = React.useRef(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<{ id: string; rombel: string }[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

    const [grades, setGrades] = useState<Grade[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
    const [narrativeNote, setNarrativeNote] = useState('');
    const [parentMessage, setParentMessage] = useState(''); // New state for parent message

    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [flaggedStudents, setFlaggedStudents] = useState<Record<string, unknown>[]>([]);
    const [, setIsAnalyzing] = useState(false);

    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false); // New state for parent message generation
    const [isCopied, setIsCopied] = useState(false); // New state for copy button
    const [flaggedClassFilter, setFlaggedClassFilter] = useState(''); // New state for flagged students filter
    const [, setIsLoading] = useState(false);
    const [classAgreement, setClassAgreement] = useState<ClassAgreement | null>(null); // New state for dynamic weights

    const [signingLocation, setSigningLocation] = useState('Jakarta');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    const { activeSemester, academicYear, userProfile, geminiModel, academicWeight, attitudeWeight } = useSettings();

    // State for calculated statistics, including radar data
    const [stats, setStats] = useState<StudentStats>({
        academicAvg: '0',
        attitudeScore: 0,
        attitudePredicate: '-',
        totalInfractionPoints: 0,
        totalStars: 0,
        attendance: { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0, schoolDays: 0, studentCount: 1 },
        finalScore: '0',
        academicWeight: 0,
        attitudeWeight: 0,
        knowledgeWeight: '0',
        practiceWeight: '0',
        studentName: '',
        subjectFilter: '',
        warnings: [],
        numDays: 0,
        radarData: {
            "Keimanan": 85,
            "Kewargaan": 85,
            "Penalaran Kritis": 85,
            "Kreativitas": 85,
            "Kolaborasi": 85,
            "Kemandirian": 85,
            "Kesehatan": 85,
            "Komunikasi": 85
        }
    });

    // Fetch Early Warning Students
    useEffect(() => {
        const fetchFlagged = async () => {
            if (!user) return;
            setIsAnalyzing(true);
            try {
                const results = await runEarlyWarningAnalysis(user.uid, activeSemester, academicYear, geminiModel);
                setFlaggedStudents(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsAnalyzing(false);
            }
        };
        fetchFlagged();

        // Load signing location using centralized logic
        setSigningLocation(getSignatureCity(userProfile as Record<string, unknown>));
    }, [activeSemester, academicYear, geminiModel, userProfile, user]);

    const handleDetectLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Browser tidak mendukung geolokasi.");
            return;
        }

        setIsDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    const city = data.address.city || data.address.town || data.address.regency || data.address.county || 'Jakarta';
                    const cleanCity = city.replace(/^(Kabupaten|Kota|Kab\.|Kota\s)\s+/i, '');
                    setSigningLocation(cleanCity);
                    localStorage.setItem('SIGNING_LOCATION', cleanCity);
                    toast.success(`Lokasi terdeteksi: ${cleanCity}`);
                } catch (error) {
                    console.error("Error detecting location:", error);
                    toast.error("Gagal mendeteksi nama kota.");
                } finally {
                    setIsDetectingLocation(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error("Gagal mendapatkan lokasi.");
                setIsDetectingLocation(false);
            }
        );
    };

    // Unified effective auth state
    const [currentUser, setCurrentUser] = useState<{ uid: string } | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Fetch classes and subjects
    useEffect(() => {
        const fetchMasters = async () => {
            if (!currentUser) return;
            try {
                const classQ = query(collection(db, 'classes'), where('userId', '==', currentUser.uid), orderBy('rombel'));
                const subjectQ = query(collection(db, 'subjects'), where('userId', '==', currentUser.uid), orderBy('name'));

                const [classSnap, subjectSnap] = await Promise.all([
                    getDocs(classQ),
                    getDocs(subjectQ)
                ]);

                setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; rombel: string })));
                setSubjects(subjectSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; name: string })));
            } catch (err) {
                console.error(err);
                toast.error('Gagal memuat data master');
            }
        };
        fetchMasters();
    }, [currentUser]);

    // Fetch students when class or auth changes
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedClass || !currentUser) {
                setStudents([]);
                return;
            }
            setIsFetchingStudents(true);
            try {
                const targetClass = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
                const classToFetchId = targetClass?.id || selectedClass;

                const q = query(
                    collection(db, 'students'),
                    where('userId', '==', currentUser.uid),
                    where('classId', '==', classToFetchId)
                );

                const snap = await getDocs(q);
                const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];

                setStudents(studentList.sort((a, b) => {
                    const absA = parseInt(String(a.absen)) || 0;
                    const absB = parseInt(String(b.absen)) || 0;
                    if (absA !== absB) return absA - absB;
                    return (a.name || '').localeCompare(b.name || '');
                }));
            } catch (err) {
                console.error(err);
                toast.error('Gagal memuat data siswa');
            } finally {
                setIsFetchingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedClass, currentUser, classes]);

    // Fetch class agreement when class changes
    useEffect(() => {
        const fetchClassAgreement = async () => {
            if (!selectedClass || !currentUser) {
                setClassAgreement(null);
                return;
            }
            try {
                const targetClass = classes.find(c => c.rombel === selectedClass);
                if (targetClass) {
                    const docRef = doc(db, 'class_agreements', `${currentUser.uid}_${targetClass.id}`);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setClassAgreement(docSnap.data() as ClassAgreement);
                    } else {
                        setClassAgreement(null);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch class agreement:", err);
            }
        };
        fetchClassAgreement();
    }, [selectedClass, classes, currentUser]);

    // Fetch all data for selected student
    useEffect(() => {
        const fetchAllData = async () => {
            if (!selectedStudentId || !user) {
                setSelectedStudent(null);
                setGrades([]);
                setAttendance([]);
                setInfractions([]);
                setAppreciations([]);
                setParentMessage('');
                return;
            }

            setIsLoading(true);
            try {
                const uid = user.uid;
                const studentDoc = students.find(s => s.id === selectedStudentId);
                setSelectedStudent(studentDoc || null);

                // Run automatic duplicate cleanup once per page load
                if (!hasCleanedUpRef.current) {
                    try {
                        const { executeAutoCleanup } = await import('../utils/databaseCleaner');
                        await executeAutoCleanup(uid, {
                            removeDuplicates: true,
                            removeOldData: false,
                            fixBrokenReferences: false
                        });
                        hasCleanedUpRef.current = true;
                    } catch (cleanupErr) {
                        console.warn("Auto cleanup on fetch failed:", cleanupErr);
                    }
                }

                const gradesQuery = query(collection(db, 'grades'), where('userId', '==', uid), where('studentId', '==', selectedStudentId));
                const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', uid), where('studentId', '==', selectedStudentId));
                const infractionsQuery = query(collection(db, 'infractions'), where('userId', '==', uid), where('studentId', '==', selectedStudentId));
                const appreciationsQuery = query(collection(db, 'studentAppreciations'), where('userId', '==', uid), where('studentId', '==', selectedStudentId));

                const [gradesSnap, attendanceSnap, infractionsSnap, appreciationsSnap] = await Promise.all([
                    getDocs(gradesQuery),
                    getDocs(attendanceQuery),
                    getDocs(infractionsQuery),
                    getDocs(appreciationsQuery)
                ]);

                const filterByPeriod = <T,>(docs: { id: string; data: () => Record<string, unknown> }[]): (T & { id: string; semester: string; academicYear: string; date?: string })[] =>
                    docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string; semester: string; academicYear: string; date?: string }))
                    .filter(d => d.semester === activeSemester && d.academicYear === academicYear)
                    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

                setGrades(filterByPeriod(gradesSnap.docs));
                setAttendance(filterByPeriod(attendanceSnap.docs));
                setInfractions(filterByPeriod(infractionsSnap.docs));
                setAppreciations(filterByPeriod(appreciationsSnap.docs));

                let existingNote = '';
                try {
                    const noteId = `${uid}_${selectedStudentId}_${activeSemester}_${academicYear.replace(/\//g, '-')}`;
                    const noteRef = doc(db, 'studentNotes', noteId);
                    const noteSnap = await getDoc(noteRef);
                    if (noteSnap.exists()) {
                        existingNote = noteSnap.data().note || '';
                    }
                } catch (e) {
                    console.warn("Note fetch restricted or failed:", (e as Error).message);
                }
                setNarrativeNote(existingNote);
                setParentMessage('');

            } catch (err) {
                console.error("Critical Error in fetchAllData:", err);
                toast.error('Gagal memuat beberapa data siswa');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [selectedStudentId, activeSemester, academicYear, students, user]);

    const availableSubjectsList = useMemo(() => subjects.map(s => s.name).sort(), [subjects]);

    const deduplicatedGrades = useMemo(() => {
        const seen = new Map<string, Grade>();
        for (const g of grades) {
            const key = [
                (g.material || '').trim().toLowerCase(),
                g.date ? (g.date.includes('T') ? g.date.split('T')[0] : g.date) : '',
                (g.assessmentType || '').trim().toLowerCase(),
                (g.subjectId || g.subjectName || '').trim().toLowerCase()
            ].join('|');

            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, g);
            } else {
                // Keep the one with a higher score (prefer the edited/updated value)
                const existingScore = parseFloat(String(existing.score)) || 0;
                const currentScore = parseFloat(String(g.score)) || 0;
                if (currentScore > existingScore) {
                    seen.set(key, g);
                }
            }
        }
        return Array.from(seen.values());
    }, [grades]);

    const filteredGrades = useMemo(() => {
        if (!selectedSubject) return deduplicatedGrades;
        const selSub = selectedSubject?.trim()?.toLowerCase() ?? '';
        const targetSubject = subjects.find(s => s.name?.trim()?.toLowerCase() === selSub || s.id?.trim()?.toLowerCase() === selSub);
        const targetSubjectId = targetSubject?.id?.trim()?.toLowerCase() ?? '';
        
        return deduplicatedGrades.filter(g => {
            const nameMatch = g.subjectName ? g.subjectName.trim().toLowerCase() === selSub : false;
            const idMatch = g.subjectId ? g.subjectId.trim().toLowerCase() === selSub || (targetSubjectId && g.subjectId.trim().toLowerCase() === targetSubjectId) : false;
            return nameMatch || idMatch;
        });
    }, [deduplicatedGrades, selectedSubject, subjects]);

    const filteredAttendance = useMemo(() => {
        if (!selectedSubject) return attendance;
        const selSub = selectedSubject?.trim()?.toLowerCase() ?? '';
        const targetSubject = subjects.find(s => s.name?.trim()?.toLowerCase() === selSub || s.id?.trim()?.toLowerCase() === selSub);
        const targetSubjectId = targetSubject?.id?.trim()?.toLowerCase() ?? '';
        
        return attendance.filter(a => {
            const nameMatch = a.subjectName ? a.subjectName.trim().toLowerCase() === selSub : false;
            const idMatch = a.subjectId ? a.subjectId.trim().toLowerCase() === selSub || (targetSubjectId && a.subjectId.trim().toLowerCase() === targetSubjectId) : false;
            return nameMatch || idMatch;
        });
    }, [attendance, selectedSubject, subjects]);

    // Handle Student Selection via URL/State
    useEffect(() => {
        const state = location.state as { studentId?: string; classId?: string; subject?: string } | null;
        if (state?.studentId && state?.classId && classes.length > 0) {
            const matchingClass = classes.find(c => c.id === state.classId);
            if (matchingClass) {
                setSelectedClass(matchingClass.rombel);
            } else {
                const classByName = classes.find(c => c.rombel === state.classId);
                if (classByName) setSelectedClass(state.classId);
            }
            if (students.length > 0) {
                const studentExists = students.find(s => s.id === state.studentId);
                if (studentExists) {
                    setSelectedStudentId(state.studentId);
                    const subjectFromState = state.subject;
                    if (subjectFromState) {
                        const matchedSub = subjects.find(s => s.id === subjectFromState || s.name.trim().toLowerCase() === subjectFromState.trim().toLowerCase());
                        if (matchedSub) {
                            setSelectedSubject(matchedSub.name);
                        } else {
                            setSelectedSubject(subjectFromState);
                        }
                    }
                    window.history.replaceState({}, document.title);
                }
            }
        }
    }, [location.state, classes, students, subjects]);

    // Calculate stats
    useEffect(() => {
        const practiceTypes = ['Praktik', 'Proyek', 'Produk', 'Portofolio', 'Keterampilan', 'Unjuk Kerja', 'Praktikum', 'Project', 'Skill'];
        const dailyTypes = ['Harian', 'Formatif', 'Sumatif', 'Ulangan', 'Tugas', 'Kuis', 'Pengetahuan', 'Homework'];
        const ptsTypes = ['Tengah Semester', 'PTS'];
        const pasTypes = ['Akhir Semester', 'PAS'];

        const dailyGrades = filteredGrades.filter(g => dailyTypes.includes(g.assessmentType));
        const ptsGrades = filteredGrades.filter(g => ptsTypes.includes(g.assessmentType));
        const pasGrades = filteredGrades.filter(g => pasTypes.includes(g.assessmentType));
        const practiceGrades = filteredGrades.filter(g => practiceTypes.includes(g.assessmentType));

        const dailyAvg = dailyGrades.length > 0 ? dailyGrades.reduce((sum, g) => sum + parseFloat(String(g.score)), 0) / dailyGrades.length : 0;
        const ptsAvg = ptsGrades.length > 0 ? ptsGrades.reduce((sum, g) => sum + parseFloat(String(g.score)), 0) / ptsGrades.length : 0;
        const pasAvg = pasGrades.length > 0 ? pasGrades.reduce((sum, g) => sum + parseFloat(String(g.score)), 0) / pasGrades.length : 0;

        let totalKnowledgeWeight = 0;
        let weightedKnowledgeSum = 0;
        if (dailyGrades.length > 0) { totalKnowledgeWeight += 2; weightedKnowledgeSum += (dailyAvg * 2); }
        if (ptsGrades.length > 0) { totalKnowledgeWeight += 1; weightedKnowledgeSum += ptsAvg; }
        if (pasGrades.length > 0) { totalKnowledgeWeight += 1; weightedKnowledgeSum += pasAvg; }

        const knowledgeAvgValue = totalKnowledgeWeight > 0 ? weightedKnowledgeSum / totalKnowledgeWeight : 0;
        const practiceAvgValue = practiceGrades.length > 0 ? practiceGrades.reduce((sum, g) => sum + parseFloat(String(g.score)), 0) / practiceGrades.length : 0;

        const knowledgeW = (classAgreement?.knowledgeWeight ?? 40) / 100;
        const practiceW = (classAgreement?.practiceWeight ?? 60) / 100;

        let academicAvgResult = 0;
        if (knowledgeAvgValue > 0 && practiceAvgValue > 0) {
            academicAvgResult = (knowledgeAvgValue * knowledgeW) + (practiceAvgValue * practiceW);
        } else if (knowledgeAvgValue > 0) {
            academicAvgResult = knowledgeAvgValue;
        } else if (practiceAvgValue > 0) {
            academicAvgResult = practiceAvgValue;
        }

        const academicAvg = academicAvgResult.toFixed(2);
        const uniqueDates = new Set(filteredAttendance.map(a => a.date));
        const numDays = uniqueDates.size;
        const attendanceCounts = filteredAttendance.reduce((acc, curr) => {
            if (curr.status) {
                const statusNormal = curr.status.trim().toLowerCase();
                if (statusNormal === 'hadir') acc.Hadir++;
                else if (statusNormal === 'sakit') acc.Sakit++;
                else if (statusNormal === 'ijin' || statusNormal === 'izin') acc.Ijin++;
                else if (statusNormal === 'alpha') acc.Alpha++;
            }
            return acc;
        }, { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0, schoolDays: numDays, studentCount: 1 });

        const totalInfractionPoints = infractions.reduce((sum, i) => sum + (i.points || 0), 0);
        const totalStars = appreciations.reduce((sum, a) => sum + (a.points || 0), 0);
        const alphaPenalty = (attendanceCounts.Alpha || 0) * 5;
        const rawAttitudeScore = 100 - totalInfractionPoints - alphaPenalty + (totalStars * 2);
        const attitudeScore = Math.min(100, Math.max(0, rawAttitudeScore));

        const warnings: string[] = [];
        if (parseFloat(academicAvg) < 65 && filteredGrades.length > 0) warnings.push(`Rata - rata akademik rendah(${academicAvg})`);
        if (attendanceCounts.Alpha >= 3) warnings.push(`${attendanceCounts.Alpha} kali Alpha(Tanpa Keterangan)`);
        if (attitudeScore < 95) warnings.push(`Skor sikap di bawah standar (${attitudeScore})`);

        const fScore = (
            (parseFloat(academicAvg) * ((classAgreement?.academicWeight ?? academicWeight) / 100)) + 
            (attitudeScore * ((classAgreement?.attitudeWeight ?? attitudeWeight) / 100))
        ).toFixed(2);

        const currentKnowledgeAvg = knowledgeAvgValue || 75;
        const currentPracticeAvg = practiceAvgValue || 75;
        const attPct = (attendanceCounts.Hadir / (numDays || 1)) * 100;
        const infPenalty = (totalInfractionPoints / 100) * 10;

        const radialMapping = {
            "Keimanan": Math.min(100, Math.max(50, 95 - infPenalty)),
            "Kewargaan": Math.min(100, Math.max(50, attPct * 0.6 + (100 - infPenalty) * 0.4)),
            "Penalaran Kritis": currentKnowledgeAvg,
            "Kreativitas": currentPracticeAvg,
            "Kolaborasi": Math.min(100, (currentKnowledgeAvg * 0.3 + currentPracticeAvg * 0.7)),
            "Kemandirian": Math.min(100, Math.max(40, attPct * 0.4 + (currentKnowledgeAvg + currentPracticeAvg) / 2 * 0.6)),
            "Kesehatan": Math.min(100, Math.max(30, 100 - (attendanceCounts.Sakit * 5))),
            "Komunikasi": Math.min(100, currentPracticeAvg)
        };

        setStats({
            academicAvg,
            attitudeScore,
            attitudePredicate: getAttitudePredicate(attitudeScore),
            totalInfractionPoints,
            totalStars,
            attendance: attendanceCounts,
            finalScore: fScore,
            academicWeight: classAgreement?.academicWeight ?? academicWeight,
            attitudeWeight: classAgreement?.attitudeWeight ?? attitudeWeight,
            knowledgeWeight: (knowledgeW * 100).toFixed(0),
            practiceWeight: (practiceW * 100).toFixed(0),
            studentName: selectedStudent?.name || '',
            subjectFilter: selectedSubject,
            warnings: warnings,
            numDays: filteredAttendance.length,
            radarData: radialMapping
        });
    }, [filteredGrades, infractions, appreciations, filteredAttendance, selectedStudent, academicWeight, attitudeWeight, selectedSubject, classAgreement]);

    const handleExportPDF = async () => {
        if (!selectedStudent || !user) return;

        let radarChartImage: string | null = null;
        try {
            const chartElement = document.getElementById('radar-chart-container');
            if (chartElement) {
                const canvas = await html2canvas(chartElement, {
                    scale: 4,
                    backgroundColor: null,
                    useCORS: true,
                    logging: false,
                    imageTimeout: 0,
                    onclone: (clonedDoc) => {
                        const clonedEl = clonedDoc.getElementById('radar-chart-container');
                        if (clonedEl) {
                            clonedEl.style.transform = 'none';
                            clonedEl.style.margin = '0';
                        }
                    }
                });
                radarChartImage = canvas.toDataURL('image/png');
            }
        } catch (error) {
            console.error("Failed to capture radar chart:", error);
        }

        generateStudentIndividualRecapPDF({
            student: selectedStudent,
            stats: stats,
            grades: filteredGrades,
            attendance: filteredAttendance,
            infractions: infractions,
            appreciations: appreciations,
            narrative: narrativeNote,
            userProfile: userProfile,
            teacherName: userProfile?.name || user.displayName || 'Guru',
            selectedSubject: selectedSubject,
            radarChartImage: radarChartImage
        });
    };

    const handleSaveNarrative = async () => {
        if (!selectedStudentId || !user) return;
        setIsSaving(true);
        try {
            const uid = user.uid;
            const noteId = `${uid}_${selectedStudentId}_${activeSemester}_${academicYear.replace(/\//g, '-')}`;
            await setDoc(doc(db, 'studentNotes', noteId), {
                studentId: selectedStudentId,
                semester: activeSemester,
                academicYear: academicYear,
                note: narrativeNote,
                updatedAt: serverTimestamp(),
                userId: uid
            }, { merge: true });
            toast.success('Catatan narasi berhasil disimpan');
        } catch (err) {
            console.error(err);
            toast.error('Gagal menyimpan catatan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateNarrative = useCallback(async (isAutoSave = false) => {
        if (!selectedStudentId || !selectedStudent || !user) return;
        setIsGenerating(true);
        try {
            const infractionsText = infractions.length > 0
                ? infractions.map(i => `- ${i.date}: ${i.type} (${i.points} poin)${i.note ? ` - ${i.note}` : ''}`).join('\n')
                : "Tidak ada catatan pelanggaran.";

            const result = await generateStudentNarrative({
                studentName: selectedStudent.name,
                grades: grades as unknown as Record<string, unknown>[],
                infractions: infractions as unknown as Record<string, unknown>[],
                infractionsText: infractionsText,
                stats: stats as unknown as Record<string, unknown>
            }, geminiModel);
            setNarrativeNote(result);

            if (isAutoSave) {
                const uid = user.uid;
                const noteId = `${uid}_${selectedStudentId}_${activeSemester}_${academicYear.replace(/\//g, '-')} `;
                await setDoc(doc(db, 'studentNotes', noteId), {
                    studentId: selectedStudentId,
                    semester: activeSemester,
                    academicYear: academicYear,
                    note: result,
                    updatedAt: serverTimestamp(),
                    userId: uid
                }, { merge: true });
            }
        } catch (err) {
            console.error(err);
            toast.error('Gagal generate narasi');
        } finally {
            setIsGenerating(false);
        }
    }, [selectedStudentId, selectedStudent, grades, infractions, stats, geminiModel, activeSemester, academicYear, user]);

    const handleGenerateParentMessage = async () => {
        if (!selectedStudentId || !selectedStudent || !narrativeNote || !user) return;
        setIsGeneratingMessage(true);
        setParentMessage('');
        try {
            const result = await generateParentMessage({
                studentName: selectedStudent.name,
                narrativeNote: narrativeNote,
                stats: stats as unknown as Record<string, unknown>,
                teacherName: String(userProfile?.name || '') || user?.displayName || 'Guru'
            }, geminiModel);
            setParentMessage(result);
            setIsCopied(false);
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat pesan orang tua');
        } finally {
            setIsGeneratingMessage(false);
        }
    };

    const handleCopyMessage = () => {
        if (parentMessage) {
            navigator.clipboard.writeText(parentMessage).then(() => {
                setIsCopied(true);
                toast.success('Pesan berhasil disalin!');
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy message:', err);
                toast.error('Gagal menyalin pesan.');
            });
        }
    };

    return (
        <div className="space-y-6">
            <StudentSelectionHeader
                navigate={navigate}
                signingLocation={signingLocation}
                setSigningLocation={setSigningLocation}
                handleDetectLocation={handleDetectLocation}
                isDetectingLocation={isDetectingLocation}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                setFlaggedClassFilter={setFlaggedClassFilter}
                setSelectedStudentId={setSelectedStudentId}
                classes={classes}
                selectedStudentId={selectedStudentId}
                isFetchingStudents={isFetchingStudents}
                students={students}
            />

            {!selectedStudentId ? (
                <StudentEmptyState
                    selectedClass={selectedClass}
                    isFetchingStudents={isFetchingStudents}
                    students={students}
                    setSelectedStudentId={setSelectedStudentId}
                    flaggedStudents={flaggedStudents as unknown as { id: string; name: string; rombel: string; classId: string }[]}
                    flaggedClassFilter={flaggedClassFilter}
                    setFlaggedClassFilter={setFlaggedClassFilter}
                    setSelectedClass={setSelectedClass}
                    classes={classes}
                />
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <StudentStatsOverview
                        stats={stats}
                        selectedSubject={selectedSubject}
                        setSelectedSubject={setSelectedSubject}
                        availableSubjects={availableSubjectsList}
                        filteredGrades={filteredGrades}
                        classAgreement={classAgreement}
                        selectedClass={selectedClass}
                        academicWeight={stats.academicWeight}
                        attitudeWeight={stats.attitudeWeight}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <StudentRadarProfile stats={stats} />
                        <div className="lg:col-span-1 space-y-6">
                            <StudentAttendanceDetail stats={stats} attendance={filteredAttendance} />
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <StudentInfractionDetail infractions={infractions} />
                            <StudentAppreciationDetail appreciations={appreciations} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StudentAcademicDetail 
                            filteredGrades={filteredGrades}
                            selectedStudentId={selectedStudentId}
                            selectedClass={selectedClass}
                            activeSemester={activeSemester}
                            academicYear={academicYear}
                            userId={user?.uid}
                            onGradesUpdated={() => {
                                const fetchAllData = async () => {
                                    if (!selectedStudentId || !user) return;
                                    try {
                                        const uid = user.uid;
                                        const gradesQuery = query(collection(db, 'grades'), where('userId', '==', uid), where('studentId', '==', selectedStudentId));
                                        const gradesSnap = await getDocs(gradesQuery);
                                        const filterByPeriod = <T,>(docs: { id: string; data: () => Record<string, unknown> }[]): (T & { id: string; semester: string; academicYear: string; date?: string })[] =>
                                            docs
                                            .map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string; semester: string; academicYear: string; date?: string }))
                                            .filter(d => d.semester === activeSemester && d.academicYear === academicYear)
                                            .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
                                        setGrades(filterByPeriod(gradesSnap.docs));
                                    } catch (err) {
                                        console.error(err);
                                    }
                                };
                                fetchAllData();
                            }}
                        />
                        <StudentNarrativeSection
                            narrativeNote={narrativeNote}
                            setNarrativeNote={setNarrativeNote}
                            handleGenerateNarrative={handleGenerateNarrative}
                            isGenerating={isGenerating}
                            handleSaveNarrative={handleSaveNarrative}
                            isSaving={isSaving}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="card-glass p-4 sm:p-6 md:p-8 flex text-white flex-col md:flex-row justify-between items-center gap-8 border border-white/10 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left relative z-10">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                                    <Download size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Cetak Rekap Portofolio</h3>
                                    <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
                                        Generate laporan PDF resmi untuk dibagikan kepada orang tua siswa. Laporan mencakup nilai, absensi, dan perilaku.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
                                <button
                                    onClick={handleExportPDF}
                                    className="bg-white text-black font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition-all shadow-lg text-xs uppercase tracking-widest"
                                >
                                    <FileText size={18} />
                                    EKSPOR PDF
                                </button>
                                <button
                                    onClick={handleGenerateParentMessage}
                                    disabled={isGeneratingMessage || !narrativeNote}
                                    className="bg-green-500 hover:bg-green-600 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg text-xs border-b-4 border-green-700 disabled:opacity-50 uppercase tracking-widest"
                                >
                                    <MessageCircle size={18} />
                                    {isGeneratingMessage ? 'Menciptakan...' : 'Pesan WA (AI)'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {parentMessage && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="card-glass w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-500">
                                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <MessageCircle size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black leading-tight">Pesan Orang Tua Cerdas</h3>
                                            <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Siap kirim via WhatsApp</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setParentMessage('')} className="p-2 hover:bg-white/20 rounded-full transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-8 overflow-y-auto custom-scrollbar">
                                    <div className="bg-gray-50 dark:bg-black/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 relative group">
                                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {parentMessage}
                                        </pre>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                                    <button
                                        onClick={() => setParentMessage('')}
                                        className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 transition-all text-sm"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        onClick={handleCopyMessage}
                                        className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-500/20 text-sm border-b-4 border-green-700"
                                    >
                                        {isCopied ? <Check size={20} /> : <Copy size={20} />}
                                        {isCopied ? 'Tersalin' : 'Salin Pesan'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RekapIndividuPage;



