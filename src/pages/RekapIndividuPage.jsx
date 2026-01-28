import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { runEarlyWarningAnalysis } from '../utils/analysis';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import moment from 'moment';
import 'moment/locale/id';
import StyledSelect from '../components/StyledSelect';
import StyledTable from '../components/StyledTable';
import PieChart from '../components/PieChart';
import SummaryCard from '../components/SummaryCard';
import {
    User,
    GraduationCap,
    FileText,
    Calendar,
    ShieldAlert,
    Download,
    Search,
    BookOpen,
    ClipboardList,
    Trophy,
    Zap,
    AlertTriangle,
    MessageCircle,
    Copy,
    Check,
    X
} from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import { generateStudentIndividualRecapPDF } from '../utils/pdfGenerator';
import { generateStudentNarrative, generateParentMessage } from '../utils/gemini';

// Set global locale for moment
moment.locale('id');

const RekapIndividuPage = () => {
    const location = useLocation();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(''); // New state for subject filter

    const [grades, setGrades] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [infractions, setInfractions] = useState([]);
    const [narrativeNote, setNarrativeNote] = useState('');
    const [parentMessage, setParentMessage] = useState(''); // New state for parent message

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [flaggedStudents, setFlaggedStudents] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false); // New state for parent message generation
    const [isCopied, setIsCopied] = useState(false); // New state for copy button
    const [flaggedClassFilter, setFlaggedClassFilter] = useState(''); // New state for flagged students filter

    const { activeSemester, academicYear, userProfile, geminiModel, academicWeight, attitudeWeight } = useSettings();

    // Fetch Early Warning Students
    useEffect(() => {
        const fetchFlagged = async () => {
            if (!auth.currentUser) return;
            setIsAnalyzing(true);
            try {
                const results = await runEarlyWarningAnalysis(auth.currentUser.uid, activeSemester, academicYear, geminiModel);
                setFlaggedStudents(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsAnalyzing(false);
            }
        };
        fetchFlagged();
    }, [activeSemester, academicYear, geminiModel]);

    // Fetch classes
    useEffect(() => {
        const fetchClasses = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid), orderBy('rombel'));
                const querySnapshot = await getDocs(q);
                setClasses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error(err);
                toast.error('Gagal memuat data kelas');
            }
        };
        fetchClasses();
    }, []);

    // Fetch students when class changes
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedClass || !auth.currentUser) {
                setStudents([]);
                return;
            }
            setIsFetchingStudents(true);
            try {
                const q = query(
                    collection(db, 'students'),
                    where('userId', '==', auth.currentUser.uid),
                    where('rombel', '==', selectedClass)
                );
                const querySnapshot = await getDocs(q);
                const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by name in memory
                setStudents(studentList.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error(err);
                toast.error('Gagal memuat data siswa');
            } finally {
                setIsFetchingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedClass]);

    // Fetch all data for selected student
    useEffect(() => {
        const fetchAllData = async () => {
            if (!selectedStudentId || !auth.currentUser) {
                setSelectedStudent(null);
                setGrades([]);
                setAttendance([]);
                setInfractions([]);
                setParentMessage(''); // Clear parent message
                return;
            }

            setIsLoading(true);
            try {
                const uid = auth.currentUser.uid;

                // 1. Student Profile
                const studentDoc = students.find(s => s.id === selectedStudentId);
                setSelectedStudent(studentDoc);

                // 2. Grades
                const gradesQuery = query(
                    collection(db, 'grades'),
                    where('userId', '==', uid),
                    where('studentId', '==', selectedStudentId)
                );

                const attendanceQuery = query(
                    collection(db, 'attendance'),
                    where('userId', '==', uid),
                    where('studentId', '==', selectedStudentId)
                );

                const infractionsQuery = query(
                    collection(db, 'infractions'),
                    where('userId', '==', uid),
                    where('studentId', '==', selectedStudentId)
                );

                // 2. Academic Data Fetch
                const [gradesSnap, attendanceSnap, infractionsSnap] = await Promise.all([
                    getDocs(gradesQuery),
                    getDocs(attendanceQuery),
                    getDocs(infractionsQuery)
                ]);

                const filterByPeriod = (docs) => docs
                    .map(doc => doc.data())
                    .filter(d => d.semester === activeSemester && d.academicYear === academicYear)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                setGrades(filterByPeriod(gradesSnap.docs));
                setAttendance(filterByPeriod(attendanceSnap.docs));
                setInfractions(filterByPeriod(infractionsSnap.docs));

                // 6. Narrative Note - Fetch gracefully to avoid blocking the whole page
                let existingNote = '';
                try {
                    const noteId = `${uid}_${selectedStudentId}_${activeSemester}_${academicYear.replace(/\//g, '-')} `;
                    const noteRef = doc(db, 'studentNotes', noteId);
                    const noteSnap = await getDoc(noteRef);
                    if (noteSnap.exists()) {
                        existingNote = noteSnap.data().note || '';
                    }
                } catch (e) {
                    console.warn("Note fetch restricted or failed:", e.message);
                }
                setNarrativeNote(existingNote);
                setParentMessage(''); // Clear parent message on student change

            } catch (err) {
                console.error("Critical Error in fetchAllData:", err);
                toast.error('Gagal memuat beberapa data siswa');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [selectedStudentId, activeSemester, academicYear, students]);

    // List of unique subjects from grades
    const availableSubjects = useMemo(() => {
        const subjects = new Set(grades.map(g => g.subjectName));
        return Array.from(subjects).sort();
    }, [grades]);

    // Filtered data for display
    const filteredGrades = useMemo(() => {
        if (!selectedSubject) return grades;
        return grades.filter(g => g.subjectName === selectedSubject);
    }, [grades, selectedSubject]);

    // Statistics - calculated based on filtered grades but all infractions
    // Handle Student Selection via URL/State (Direct link from Early Warning)
    useEffect(() => {
        if (location.state?.studentId && location.state?.classId && classes.length > 0) {
            setSelectedClass(location.state.classId);
            // Need a slight delay or wait for students to be loaded
            if (students.length > 0) {
                const studentExists = students.find(s => s.id === location.state.studentId);
                if (studentExists) {
                    setSelectedStudentId(location.state.studentId);
                    if (location.state.subject) {
                        setSelectedSubject(location.state.subject);
                    }
                    // Clear state to avoid re-triggering on refresh if not intended
                    window.history.replaceState({}, document.title);
                }
            }
        }
    }, [location.state, classes, students]);

    const stats = useMemo(() => {
        const knowledgeTypes = ['Harian', 'Formatif', 'Sumatif', 'Ulangan', 'Tengah Semester', 'PTS', 'Akhir Semester', 'PAS'];
        const knowledgeGrades = filteredGrades.filter(g => knowledgeTypes.includes(g.assessmentType));
        const practiceGrades = filteredGrades.filter(g => g.assessmentType === 'Praktik');

        const knowledgeAvg = knowledgeGrades.length > 0
            ? knowledgeGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) / knowledgeGrades.length
            : 0;

        const practiceAvg = practiceGrades.length > 0
            ? practiceGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) / practiceGrades.length
            : 0;

        let academicAvgResult = 0;
        if (knowledgeAvg > 0 && practiceAvg > 0) {
            academicAvgResult = (knowledgeAvg * 0.4) + (practiceAvg * 0.6);
        } else if (knowledgeAvg > 0) {
            academicAvgResult = knowledgeAvg;
        } else if (practiceAvg > 0) {
            academicAvgResult = practiceAvg;
        }

        const academicAvg = academicAvgResult.toFixed(2);

        const totalInfractionPoints = infractions.reduce((sum, i) => sum + (i.points || 0), 0);
        const attitudeScore = Math.max(0, 100 - totalInfractionPoints);

        const uniqueDates = new Set(attendance.map(a => a.date));
        const numDays = uniqueDates.size;

        const attendanceCounts = attendance.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {
            Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0,
            schoolDays: numDays,
            studentCount: 1
        });

        const getAttitudePredicate = (score) => {
            if (score >= 91) return 'Sangat Baik';
            if (score >= 81) return 'Baik';
            if (score >= 71) return 'Cukup';
            return 'Kurang';
        };

        // Early Warning Logic
        const warnings = [];
        if (parseFloat(academicAvg) < 65 && filteredGrades.length > 0) {
            warnings.push(`Rata - rata akademik rendah(${academicAvg})`);
        }
        if (attendanceCounts.Alpha >= 3) {
            warnings.push(`${attendanceCounts.Alpha} kali Alpha(Tanpa Keterangan)`);
        }
        if (attitudeScore < 95) {
            warnings.push(`Skor sikap di bawah standar(${attitudeScore})`);
        }

        return {
            academicAvg,
            attitudeScore,
            attitudePredicate: getAttitudePredicate(attitudeScore),
            totalInfractionPoints,
            attendance: attendanceCounts,
            finalScore: ((parseFloat(academicAvg) * (academicWeight / 100)) + (attitudeScore * (attitudeWeight / 100))).toFixed(2),
            studentName: selectedStudent?.name || '',
            subjectFilter: selectedSubject,
            warnings: warnings,
            numDays: attendance.length
        };
    }, [filteredGrades, infractions, attendance, selectedStudent, academicWeight, attitudeWeight, selectedSubject]);

    const handleExportPDF = () => {
        if (!selectedStudent) return;

        generateStudentIndividualRecapPDF({
            student: selectedStudent,
            stats: stats,
            grades: filteredGrades, // Export only filtered grades
            attendance: attendance,
            infractions: infractions,
            narrative: narrativeNote,
            userProfile: userProfile,
            teacherName: userProfile?.name || auth.currentUser.displayName || 'Guru',
            selectedSubject: selectedSubject // Pass context to PDF
        });
    };

    const handleSaveNarrative = async () => {
        if (!selectedStudentId) return;
        setIsSaving(true);
        try {
            const uid = auth.currentUser.uid;
            const noteId = `${uid}_${selectedStudentId}_${activeSemester}_${academicYear.replace(/\//g, '-')} `;
            await setDoc(doc(db, 'studentNotes', noteId), {
                studentId: selectedStudentId,
                semester: activeSemester,
                academicYear: academicYear,
                note: narrativeNote,
                updatedAt: serverTimestamp(),
                userId: auth.currentUser.uid
            }, { merge: true });
            toast.success('Catatan narasi berhasil disimpan');
        } catch (err) {
            console.error(err);
            toast.error('Gagal menyimpan catatan');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-generate narrative if empty after fetching
    useEffect(() => {
        if (!isLoading && selectedStudentId && !narrativeNote && !isGenerating && stats.studentName && stats.academicAvg !== 0) {
            handleGenerateNarrative(true);
        }
    }, [isLoading, selectedStudentId, narrativeNote, isGenerating, stats]);

    const handleGenerateNarrative = async (isAutoSave = false) => {
        if (!selectedStudentId) return;
        setIsGenerating(true);
        try {
            const result = await generateStudentNarrative({
                studentName: selectedStudent.name,
                grades: grades,
                attendance: attendance,
                infractions: infractions,
                stats: stats
            }, userProfile, geminiModel);
            setNarrativeNote(result);

            if (isAutoSave) {
                const uid = auth.currentUser.uid;
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
    };

    const handleGenerateParentMessage = async () => {
        if (!selectedStudentId || !narrativeNote) return;
        setIsGeneratingMessage(true);
        setParentMessage(''); // Clear previous message
        try {
            const result = await generateParentMessage({
                studentName: selectedStudent.name,
                narrativeNote: narrativeNote,
                stats: stats,
                teacherName: userProfile?.name || auth.currentUser?.displayName || 'Guru'
            }, geminiModel);
            setParentMessage(result);
            setIsCopied(false); // Reset copy status
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
                setTimeout(() => setIsCopied(false), 2000); // Reset copied state after 2 seconds
            }).catch(err => {
                console.error('Failed to copy message:', err);
                toast.error('Gagal menyalin pesan.');
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Selection Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                            <User className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 dark:text-white">Rekap Individu Siswa</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Rekam jejak komprehensif perjalanan belajar siswa</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 min-w-[300px]">
                        <StyledSelect value={selectedClass} onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedStudentId('');
                        }}>
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                        </StyledSelect>
                        <StyledSelect
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            disabled={!selectedClass || isFetchingStudents}
                        >
                            <option value="">{isFetchingStudents ? 'Memuat siswa...' : 'Pilih Siswa'}</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>
                    </div>
                </div>
            </div>

            {!selectedStudentId ? (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-12 rounded-[3rem] text-center shadow-xl">
                        <Search size={64} className="text-blue-500/20 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Pilih Siswa untuk Rekap</h2>
                        <p className="text-gray-500 dark:text-gray-400">Pilih kelas dan nama siswa di atas untuk melihat rekam jejak lengkap</p>
                    </div>

                    {flaggedStudents.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h2 className="text-xl font-black text-gray-800 dark:text-white">Siswa Perlu Perhatian Segera</h2>
                                </div>
                                <div className="w-full sm:w-48">
                                    <StyledSelect
                                        value={flaggedClassFilter}
                                        onChange={(e) => setFlaggedClassFilter(e.target.value)}
                                        className="!py-2 !text-xs"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                                    </StyledSelect>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {flaggedStudents
                                    .filter(s => !flaggedClassFilter || s.rombel === flaggedClassFilter)
                                    .map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                setSelectedClass(student.rombel);
                                                setSelectedStudentId(student.id);
                                            }}
                                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-5 rounded-3xl border-l-4 border-red-500 text-left hover:scale-[1.02] transition-all shadow-lg group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-black text-gray-800 dark:text-white group-hover:text-red-500 transition-colors uppercase truncate mr-2">{student.name}</h3>
                                                <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 uppercase">{student.rombel}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {student.warnings.map((w, idx) => (
                                                    <p key={idx} className="text-[10px] text-red-500/80 font-medium flex items-center gap-1">
                                                        <span className="w-1 h-1 bg-red-400 rounded-full" /> {w}
                                                    </p>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Detail Rekap →</span>
                                                {student.totalPointsDeducted > 0 && (
                                                    <span className="text-[10px] font-bold text-gray-400">-{student.totalPointsDeducted} Poin Pelanggaran</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Filter Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                        {stats.warnings.length > 0 ? (
                            <div className="flex-1 w-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-xl text-red-600 dark:text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Peringatan Siswa Bermasalah</p>
                                    <p className="text-xs text-red-500 dark:text-red-400 opacity-80">{stats.warnings.join(' • ')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 hidden md:block" />
                        )}
                        <div className="w-full md:w-64">
                            <StyledSelect
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                            >
                                <option value="">Semua Mata Pelajaran</option>
                                {availableSubjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </StyledSelect>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            title={selectedSubject ? `Rata-rata ${selectedSubject}` : "Rata-rata Akademik"}
                            value={stats.academicAvg}
                            icon={<GraduationCap className="w-8 h-8 text-blue-500" />}
                            color="blue"
                            subtitle={`Berdasarkan ${filteredGrades.length} penilaian`}
                        />
                        <SummaryCard
                            title={`Nilai Sikap (${stats.attitudePredicate})`}
                            value={stats.attitudeScore}
                            icon={<ShieldAlert className="w-8 h-8 text-emerald-500" />}
                            color="green"
                            subtitle={`Poin Pelanggaran: ${stats.totalInfractionPoints}`}
                        />
                        <SummaryCard
                            title={`Nilai Akhir (${academicWeight}/${attitudeWeight})`}
                            value={stats.finalScore}
                            icon={<Trophy className="w-8 h-8 text-purple-500" />}
                            color="purple"
                            subtitle={`(${academicWeight}% Akad + ${attitudeWeight}% Sikap)`}
                        />
                        <SummaryCard
                            title="Kehadiran"
                            value={stats.attendance.Hadir}
                            icon={<Calendar className="w-8 h-8 text-amber-500" />}
                            color="yellow"
                            subtitle={`S: ${stats.attendance.Sakit} | I: ${stats.attendance.Ijin} | A: ${stats.attendance.Alpha}`}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Attendance Detail */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                                        <Calendar size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Kehadiran</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="w-full">
                                    <PieChart data={stats.attendance} numDays={stats.numDays} />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                    <table className="w-full text-left">
                                        <tbody className="text-xs divide-y dark:divide-gray-700">
                                            {attendance.length > 0 ? attendance.map((att, i) => (
                                                <tr key={i}>
                                                    <td className="py-2 text-gray-500 text-[10px] font-medium">{moment(att.date).format('DD/MM/YY')}</td>
                                                    <td className="py-2 font-bold text-gray-800 dark:text-gray-200">
                                                        {new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(att.date))}
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${att.status === 'Hadir' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                            att.status === 'Alpha' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                                                            }`}>
                                                            {att.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="py-10 text-center text-gray-400">Belum ada data absensi</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Infraction Detail */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catatan Kedisiplinan</h2>
                                </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    {infractions.length > 0 ? infractions.map((inf, i) => (
                                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(inf.date))}
                                                </span>
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 text-[10px] font-black rounded-md">+{inf.points} POIN</span>
                                            </div>
                                            <p className="font-bold text-gray-800 dark:text-gray-200">{inf.infractionType}</p>
                                            {inf.description && <p className="text-xs text-gray-500 mt-1 italic">{inf.description}</p>}
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center text-gray-400">Tidak ada catatan pelanggaran</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Academic Detail */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                                        <BookOpen size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Akademik</h2>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="pb-4">Tanggal</th>
                                            <th className="pb-4">Materi / Subjek</th>
                                            <th className="pb-4 text-right">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y dark:divide-gray-700">
                                        {filteredGrades.length > 0 ? filteredGrades.map((g, i) => (
                                            <tr key={i} className="group">
                                                <td className="py-3 text-gray-500">{moment(g.date).format('DD/MM/YYYY')}</td>
                                                <td className="py-3">
                                                    <p className="font-bold text-gray-800 dark:text-gray-200">{g.material}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase">{g.subjectName} • {g.assessmentType}</p>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`px-2.5 py-1 rounded-lg font-bold ${parseFloat(g.score) >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                                                        {g.score}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="py-10 text-center text-gray-400">Belum ada data nilai</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Narrative Note */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                                        <FileText size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catatan Guru Mapel</h2>
                                </div>
                                <button
                                    onClick={handleGenerateNarrative}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-xl text-[10px] font-black hover:bg-purple-200 transition-all disabled:opacity-50"
                                >
                                    <Zap size={12} fill="currentColor" />
                                    {isGenerating ? 'AI Menganalisis...' : 'SMARTY AI'}
                                </button>
                            </div>

                            <textarea
                                value={narrativeNote}
                                onChange={(e) => setNarrativeNote(e.target.value)}
                                placeholder="Tuliskan catatan kemajuan belajar, saran, dan motivasi untuk siswa..."
                                className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-700 dark:text-gray-300 custom-scrollbar resize-none mb-4"
                            />

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveNarrative}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Note'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Export Section - Refactored to full width since narrative moved */}
                        <div className="bg-gradient-to-br from-gray-800 to-black p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border border-white/10">
                            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
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

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
                </div>
            )}

            {/* Modal for Parent Message */}
            {parentMessage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                                className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 transition-all"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={handleCopyMessage}
                                className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-500/20"
                            >
                                {isCopied ? <Check size={20} /> : <Copy size={20} />}
                                {isCopied ? 'TERSALIN!' : 'SALIN & KIRIM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RekapIndividuPage;
