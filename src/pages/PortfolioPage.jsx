import React, { useState, useEffect } from 'react';
import {
    Book, Sparkles, Send, Download, Save, RefreshCw, ChevronRight, FileText,
    PieChart, BarChart, ShieldCheck, Zap, Bot, Loader, Trash2, AlertTriangle
} from 'lucide-react';
import Modal from '../components/Modal';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useSettings } from '../utils/SettingsContext';
import { generatePortfolioChapter } from '../utils/gemini';
import toast from 'react-hot-toast';
import VisualAnalytics from '../components/portfolio/VisualAnalytics';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHAPTERS = [
    { id: 1, title: 'BAB I: PENDAHULUAN', icon: <Book size={20} /> },
    { id: 2, title: 'BAB II: PEMETAAN KURIKULUM & TARGET', icon: <FileText size={20} /> },
    { id: 3, title: 'BAB III: STRATEGI PEMBELAJARAN (PEDAGOGY)', icon: <Zap size={20} /> },
    { id: 4, title: 'BAB IV: ANALISIS HASIL BELAJAR (MAPEL)', icon: <PieChart size={20} /> },
    { id: 5, title: 'BAB V: DISIPLIN AKADEMIK & ETIKA', icon: <ShieldCheck size={20} /> },
    { id: 6, title: 'BAB VI: EVALUASI PERIODE (SWOT)', icon: <Bot size={20} /> },
    { id: 7, title: 'BAB VII: PENUTUP & REKOMENDASI', icon: <Sparkles size={20} /> },
];

export default function PortfolioPage() {
    const { activeSemester, academicYear } = useSettings();
    const [activeChapter, setActiveChapter] = useState(1);
    const [chaptersContent, setChaptersContent] = useState({});
    const [liveContextData, setLiveContextData] = useState({});
    const [isLiveContextLoading, setIsLiveContextLoading] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, chapterId: null });
    const [isGenerating, setIsGenerating] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    const completedCount = Object.keys(chaptersContent).length;
    const completionPercentage = Math.round((completedCount / CHAPTERS.length) * 100);
    useEffect(() => {
        const loadData = async () => {
            if (!auth.currentUser) return;
            setIsLoading(true);
            try {
                // Load subjects first
                const subQ = query(collection(db, 'subjects'), where('userId', '==', auth.currentUser.uid));
                const subSnap = await getDocs(subQ);
                const fetchedSub = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setSubjects(fetchedSub);
                if (fetchedSub.length > 0 && !selectedSubject) {
                    setSelectedSubject(fetchedSub[0].name);
                }

                // Load teacher profile
                const profileRef = doc(db, 'users', auth.currentUser.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    setUserProfile(profileSnap.data());
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadPortfolio = async () => {
            if (!auth.currentUser || !selectedSubject) return;
            setIsLoading(true);
            try {
                const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
                const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
                const safeSubject = selectedSubject.replace(/\s+/g, '_');
                const docId = `${auth.currentUser.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
                const docRef = doc(db, 'semesterPortfolios', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setChaptersContent(docSnap.data().chapters || {});
                } else {
                    setChaptersContent({});
                }
            } catch (error) {
                console.error("Error loading portfolio:", error);
                toast.error("Gagal memuat data portofolio.");
            } finally {
                setIsLoading(false);
            }
        };
        loadPortfolio();
    }, [academicYear, activeSemester, selectedSubject]);

    const saveChapter = async (chapId, content, context) => {
        if (!auth.currentUser || !selectedSubject) return;
        try {
            const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
            const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${auth.currentUser.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
            const docRef = doc(db, 'semesterPortfolios', docId);
            const currentDraft = chaptersContent[chapId] || {};

            const newChapterData = {
                content,
                context,
                status: 'done',
                updatedAt: new Date()
            };

            const updatedChapters = {
                ...chaptersContent,
                [chapId]: newChapterData
            };

            // Clean up any 'undefined' values which Firestore rejects
            const safeChapters = JSON.parse(JSON.stringify(updatedChapters));

            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { chapters: safeChapters });
            } else {
                await setDoc(docRef, {
                    userId: auth.currentUser.uid,
                    academicYear,
                    semester: activeSemester,
                    chapters: safeChapters
                });
            }
            setChaptersContent(updatedChapters);
            toast.success("Bab berhasil disimpan.");
        } catch (error) {
            console.error("Error saving chapter:", error);
            toast.error("Gagal menyimpan bab.");
        }
    };

    const handleDeleteChapter = (chapId) => {
        setConfirmDeleteModal({ isOpen: true, chapterId: chapId });
    };

    const confirmDelete = async () => {
        const chapId = confirmDeleteModal.chapterId;
        setConfirmDeleteModal({ isOpen: false, chapterId: null });

        try {
            const safeYear = academicYear.replace(/\//g, '_');
            const safeSemester = activeSemester.replace(/\//g, '_');
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${auth.currentUser.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
            const docRef = doc(db, 'semesterPortfolios', docId);

            const newChapters = { ...chaptersContent };
            delete newChapters[chapId];

            const safeChapters = JSON.parse(JSON.stringify(newChapters));
            await updateDoc(docRef, { chapters: safeChapters });

            setChaptersContent(newChapters);
            toast.success("Bab berhasil dihapus.");
        } catch (error) {
            console.error("Error deleting chapter:", error);
            toast.error("Gagal menghapus bab.");
        }
    };

    const gatherContext = async (chapId) => {
        const uid = auth?.currentUser?.uid;
        if (!uid) return {};


        try {
            switch (chapId) {
                case 1: { // Pendahuluan
                    // Fetch all classes taught by this teacher
                    const qClasses = query(collection(db, 'classes'), where('userId', '==', uid));
                    const snapClasses = await getDocs(qClasses);

                    // Fetch all students to count them per class
                    const qStudents = query(collection(db, 'students'), where('userId', '==', uid));
                    const snapStudents = await getDocs(qStudents);
                    const allStudents = snapStudents.docs.map(d => d.data());

                    const classList = snapClasses.docs.map(d => {
                        const data = d.data();
                        const classId = d.id;

                        // Count students for this specific class
                        const count = allStudents.filter(s => s.classId === classId || s.rombel === data.rombel).length;

                        // Format Name: Prioritize 'name', then format 'Kelas Level-Rombel', fallback to ID
                        let formattedName = data.name || data.className;
                        if (!formattedName || formattedName.length > 20) { // Likely an ID or generic
                            formattedName = `Kelas ${data.level || ''}-${data.rombel || ''}`.replace(/-$/, '');
                        }

                        return {
                            id: classId,
                            name: formattedName,
                            level: data.level || '',
                            rombel: data.rombel || '',
                            studentCount: count || 0
                        };
                    });

                    // Sort classes naturally (Level then Rombel)
                    classList.sort((a, b) => {
                        const levelComp = String(a.level || '').localeCompare(String(b.level || ''), undefined, { numeric: true });
                        if (levelComp !== 0) return levelComp;
                        return String(a.rombel || '').localeCompare(String(b.rombel || ''));
                    });

                    // Fetch curriculum context for Vision/Mission alignment
                    const qLesson = query(collection(db, 'lessonPlans'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subject', '==', selectedSubject)
                    );
                    const snapLesson = await getDocs(qLesson);
                    const lessons = snapLesson.docs.map(d => ({ topic: d.data().topic, kd: d.data().kd }));

                    const qProg = query(collection(db, 'teachingPrograms'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester)
                    );
                    const snapProg = await getDocs(qProg);
                    const programs = snapProg.docs
                        .map(d => d.data())
                        .filter(data => {
                            const docSubject = data.subject || '';
                            const docSubjectName = data.subjectName || '';
                            return docSubject === selectedSubject || docSubjectName === selectedSubject || docSubject.includes(selectedSubject);
                        })
                        .map(data => ({
                            gradeLevel: data.gradeLevel,
                            prota: data.prota,
                            atpItems: data.atpItems
                        }));

                    return {
                        namaGuru: userProfile?.name || 'Guru',
                        sekolah: userProfile?.school || userProfile?.schoolName || '',
                        jenjangSekolah: userProfile?.schoolLevel || 'SD',
                        nip: userProfile?.nip || '',
                        mataPelajaran: selectedSubject,
                        tahunAjaran: academicYear,
                        semester: activeSemester,
                        daftarKelas: classList,
                        totalSiswa: classList.reduce((sum, c) => sum + (c.studentCount || 0), 0),
                        visiContext: {
                            topics: lessons.map(l => l.topic),
                            gradeLevels: [...new Set(programs.map(p => p.gradeLevel))]
                        }
                    };
                }
                case 2: { // Kurikulum
                    // lessonPlans uses 'subject'
                    const qLesson = query(collection(db, 'lessonPlans'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subject', '==', selectedSubject)
                    );
                    const snapLesson = await getDocs(qLesson);
                    const lessons = snapLesson.docs.map(d => ({ topic: d.data().topic, kd: d.data().kd }));

                    const qProg = query(collection(db, 'teachingPrograms'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester)
                    );
                    const snapProg = await getDocs(qProg);
                    const programs = snapProg.docs
                        .map(d => d.data())
                        .filter(data => {
                            const docSubject = data.subject || '';
                            const docSubjectName = data.subjectName || '';
                            return docSubject === selectedSubject || docSubjectName === selectedSubject || docSubject.includes(selectedSubject);
                        })
                        .map(data => ({
                            gradeLevel: data.gradeLevel,
                            prota: data.prota,
                            atpItems: data.atpItems
                        }));

                    return { generatedLessons: lessons, teachingPrograms: programs };
                }
                case 3: { // Pedagogi (Jurnal)
                    // teachingJournals uses 'subjectName'
                    const q = query(collection(db, 'teachingJournals'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subjectName', '==', selectedSubject)
                    );
                    const snap = await getDocs(q);

                    // Fetch last 50 entries with full pedagogical data
                    const docs = snap.docs.map(d => ({
                        date: d.data().date,
                        material: d.data().material,
                        learningObjectives: d.data().learningObjectives,
                        learningActivities: d.data().learningActivities,
                        reflection: d.data().reflection,
                        challenges: d.data().challenges,
                        followUp: d.data().followUp,
                        isImplemented: d.data().isImplemented !== false
                    }));
                    docs.sort((a, b) => new Date(b.date) - new Date(a.date));

                    return docs.slice(0, 50);
                }
                case 4: { // Hasil Belajar (Nilai)
                    // grades collection uses 'subjectName'
                    const q = query(collection(db, 'grades'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subjectName', '==', selectedSubject)
                    );
                    const snap = await getDocs(q);

                    const rawData = snap.docs.map(d => d.data());

                    // Group by material/assessment type for overall summary
                    const byAssessment = {};
                    rawData.forEach(d => {
                        const key = d.material || d.assessmentType || 'Lainnya';
                        if (!byAssessment[key]) byAssessment[key] = { total: 0, count: 0 };
                        byAssessment[key].total += Number(d.score) || 0;
                        byAssessment[key].count += 1;
                    });

                    const rekapPerJenisNilai = Object.entries(byAssessment).map(([name, stats]) => ({
                        subject: name,
                        score: Math.round(stats.total / stats.count)
                    }));

                    // Group by class for cross-class comparison
                    const byClass = {};
                    rawData.forEach(d => {
                        const className = d.className || d.classId || 'Tidak Diketahui';
                        if (!byClass[className]) byClass[className] = { total: 0, count: 0, missing: 0 };
                        byClass[className].count += 1;
                        byClass[className].total += Number(d.score) || 0;
                        if (!d.score || d.score === 0 || d.score === '') byClass[className].missing += 1;
                    });

                    const komparasiAntarKelas = Object.entries(byClass).map(([kelas, stats]) => ({
                        kelas,
                        rataRata: Math.round(stats.total / stats.count),
                        jumlahData: stats.count,
                        tingkatPengumpulan: `${(((stats.count - stats.missing) / stats.count) * 100).toFixed(1)}% `,
                    })).sort((a, b) => b.rataRata - a.rataRata);

                    return {
                        rekapPerJenisNilai,         // for VisualAnalytics chart
                        komparasiAntarKelas          // for AI class comparison
                    };
                }
                case 5: { // Disiplin
                    // infractions collection is global per teacher/semester
                    const q_infractions = query(collection(db, 'infractions'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester)
                    );
                    const snap_infractions = await getDocs(q_infractions);
                    const infractions = snap_infractions.docs.map(d => d.data().infractionType);

                    // Fetch grades to deduce assignment submission discipline (User's brilliant idea)
                    const q_grades = query(collection(db, 'grades'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subjectName', '==', selectedSubject)
                    );
                    const snap_grades = await getDocs(q_grades);

                    let totalAssignments = 0;
                    let missingAssignments = 0;

                    snap_grades.docs.forEach(doc => {
                        totalAssignments++;
                        const score = doc.data().score;
                        // Assuming 0 or empty means not submitted/missing
                        if (score === 0 || score === "" || score === null || score === undefined) {
                            missingAssignments++;
                        }
                    });

                    // Define submission rate
                    let submissionRate = "100%";
                    if (totalAssignments > 0) {
                        submissionRate = `${(((totalAssignments - missingAssignments) / totalAssignments) * 100).toFixed(1)}% `;
                    }

                    const assignmentDiscipline = {
                        totalTargetPengumpulanTugasDariSeluruhSiswa: totalAssignments, // e.g. 35 students * 10 tasks = 350
                        jumlahSiswaBelumMengumpulkan: missingAssignments,
                        tingkatKepatuhanPengumpulan: submissionRate,
                        catatan: missingAssignments === 0 ? "Sangat disiplin" : "Ada indikasi keterlambatan/tidak mengumpulkan"
                    };

                    // Fetch teachingJournals to deduce student participation/activity
                    const q_journals = query(collection(db, 'teachingJournals'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subjectName', '==', selectedSubject)
                    );
                    const snap_journals = await getDocs(q_journals);

                    let discussionCount = 0;
                    let totalMeetings = snap_journals.docs.length;
                    const participationKeywords = ['aktif', 'diskusi', 'bertanya', 'antusias', 'partisipasi', 'presentasi', 'tanya jawab', 'kolaborasi'];

                    snap_journals.docs.forEach(doc => {
                        const dat = doc.data();
                        const combinedText = `${dat.learningActivities || ''} ${dat.reflection || ''} ${dat.challenges || ''} `.toLowerCase();

                        const hasDiscussion = participationKeywords.some(keyword => combinedText.includes(keyword));
                        if (hasDiscussion) discussionCount++;
                    });

                    let participationRate = "N/A";
                    if (totalMeetings > 0) {
                        participationRate = `${((discussionCount / totalMeetings) * 100).toFixed(1)}% `;
                    }

                    const activeParticipation = {
                        totalPertemuan: totalMeetings,
                        pertemuanDenganDiskusiAktif: discussionCount,
                        tingkatPartisipasi: participationRate,
                        catatan: discussionCount > (totalMeetings / 2) ? "Siswa sangat aktif dan partisipatif" : "Interaksi satu arah masih cukup mendominasi"
                    };

                    return {
                        infractions,
                        analisisKedisiplinanTugas: assignmentDiscipline,
                        partisipasiSiswa: activeParticipation
                    };
                }
                case 6: { // SWOT (Full notes from Jurnal)
                    const q = query(collection(db, 'teachingJournals'),
                        where('userId', '==', uid),
                        where('academicYear', '==', academicYear),
                        where('semester', '==', activeSemester),
                        where('subjectName', '==', selectedSubject)
                    );
                    const docs = snap.docs.map(d => ({
                        material: d.data().material,
                        reflection: d.data().reflection,
                        challenges: d.data().challenges,
                        followUp: d.data().followUp
                    })).filter(d => Boolean(d.reflection || d.challenges));

                    return docs.slice(0, 40);
                }
                case 7: { // Penutup
                    return { academicYear, activeSemester };
                }
                default: return {};
            }
        } catch (err) {
            console.error("Context gather error:", err);
            return {};
        }
    };

    // Auto-fetch context specifically for rendering graphs without waiting for AI generation
    useEffect(() => {
        const fetchLiveContext = async () => {
            if (!activeChapter || !selectedSubject || !academicYear || !activeSemester || !auth?.currentUser?.uid) return;

            setIsLiveContextLoading(prev => ({ ...prev, [activeChapter]: true }));
            const context = await gatherContext(activeChapter);
            setLiveContextData(prev => ({ ...prev, [activeChapter]: context }));
            setIsLiveContextLoading(prev => ({ ...prev, [activeChapter]: false }));
        };
        fetchLiveContext();
    }, [activeChapter, selectedSubject, academicYear, activeSemester]);

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        const loadingToast = toast.loading(`Sedang menyusun ${CHAPTERS.find(c => c.id === activeChapter)?.title}...`);

        try {
            // Use live cached context if available, else fetch
            const context = liveContextData[activeChapter] || await gatherContext(activeChapter);
            const content = await generatePortfolioChapter(activeChapter, context, userProfile, selectedSubject);
            await saveChapter(activeChapter, content, context);
            toast.success(`Bab ${activeChapter} berhasil disusun!`, { id: loadingToast });
        } catch (error) {
            console.error("Generation error:", error);
            const errorMsg = error.message?.includes('503')
                ? "Server AI sedang sibuk (Overload). Silakan coba lagi dalam beberapa saat."
                : (error.message || "Gagal menyusun bab.");
            toast.error(errorMsg, { id: loadingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportWord = async () => {
        const content = chaptersContent[activeChapter]?.content;
        if (!content) return;

        try {
            const htmlContent = `
    < !DOCTYPE html >
        <html>
            <head><meta charset="utf-8"></head>
            <body>
                <h1 style="text-align: center;">${CHAPTERS.find(c => c.id === activeChapter).title}</h1>
                <p style="text-align: center;"><i>Semester: ${activeSemester} | Tahun Ajaran: ${academicYear}</i></p>
                <hr>
                    <div style="font-family: 'Times New Roman', serif;">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
            </body>
        </html>
`;
            const blob = await asBlob(htmlContent);
            saveAs(blob, `Portofolio_Bab_${activeChapter}_${academicYear}_S${activeSemester}.docx`);
            toast.success("File Word berhasil diunduh.");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal mengunduh file Word.");
        }
    };

    // Convert Markdown to HTML for Word export (handles tables, headings, lists, bold, italic)
    const markdownToHtml = (md) => {
        if (!md) return '';
        let html = md;

        // ---- Tables ----
        html = html.replace(/^(\|.+\|[ \t]*)\n(\|[-| :]+\|[ \t]*)\n((\|.+\|[ \t]*\n?)+)/gm, (match, header, separator, body) => {
            const headers = header.split('|').map(c => c.trim()).filter(Boolean);
            const rows = body.trim().split('\n').map(row =>
                row.split('|').map(c => c.trim()).filter(Boolean)
            );
            const thead = `<tr>${headers.map(h => `<th style="border:1px solid #999;padding:6px;background:#f2f2f2;font-weight:bold">${h}</th>`).join('')}</tr>`;
            const tbody = rows.map(row =>
                `<tr>${row.map(cell => `<td style="border:1px solid #999;padding:6px">${cell}</td>`).join('')}</tr>`
            ).join('');
            return `<table style="border-collapse:collapse;width:100%;margin:12px 0"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
        });

        // ---- Headings ----
        html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

        // ---- Bold & Italic ----
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');

        // ---- Bullet Lists ----
        html = html.replace(/((?:^[ \t]*[-*+][ \t]+.+\n?)+)/gm, (block) => {
            const items = block.trim().split('\n').map(line => `<li>${line.replace(/^[ \t]*[-*+][ \t]+/, '')}</li>`).join('');
            return `<ul style="margin:8px 0;padding-left:24px">${items}</ul>`;
        });

        // ---- Numbered Lists ----
        html = html.replace(/((?:^[ \t]*\d+\.[ \t]+.+\n?)+)/gm, (block) => {
            const items = block.trim().split('\n').map(line => `<li>${line.replace(/^[ \t]*\d+\.[ \t]+/, '')}</li>`).join('');
            return `<ol style="margin:8px 0;padding-left:24px">${items}</ol>`;
        });

        // ---- Paragraphs (remaining plain lines) ----
        html = html.replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p style="text-align:justify;margin:6px 0">$1</p>');
        html = html.replace(/\n{2,}/g, '');

        return html;
    };

    const handleExportFullReport = async () => {
        setIsLoading(true);
        try {
            const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
            const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${auth.currentUser.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
            const docRef = doc(db, 'semesterPortfolios', docId);
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                toast.error("Data portofolio belum tersedia.");
                return;
            }

            const chapters = snap.data().chapters || {};
            let combinedHtml = `
    < !DOCTYPE html >
        <html>
            <head><meta charset="utf-8"></head>
            <body>
                <h1 style="text-align: center; font-size: 24pt;">LAPORAN PORTOFOLIO SEMESTER</h1>
                <p style="text-align: center;">${academicYear} - Semester ${activeSemester}</p>
                <br><br>
                    `;

            CHAPTERS.forEach(chap => {
                if (chapters[chap.id]) {
                    combinedHtml += `
                        <h2 style="margin-top: 30px;">${chap.title}</h2>
                        <div style="font-family: 'Times New Roman', serif; margin-bottom: 20px;">
                            ${markdownToHtml(chapters[chap.id].content)}
                        </div>
                        <br clear="all" style="page-break-before:always">
                    `;
                }
            });

            combinedHtml += `</body></html>`;

            const blob = await asBlob(combinedHtml);
            saveAs(blob, `Laporan_Lengkap_Portofolio_${academicYear}_S${activeSemester}.docx`);
            toast.success("Laporan Lengkap berhasil diunduh.");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal mengunduh laporan.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader className="animate-spin text-indigo-600" size={40} />
                <p className="text-gray-500 font-medium animate-pulse">Memuat Portofolio...</p>
            </div>
        );
    }

    const currentDraft = chaptersContent[activeChapter]?.content;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Book size={200} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Smartty Semester Portfolio</h1>
                        <p className="text-indigo-100 text-lg font-medium">Buku Audit Akademik & Laporan Kinerja Guru Profesional</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/20">TA {academicYear} • SMTR {activeSemester?.toUpperCase()}</span>
                            <span className="px-3 py-1 bg-green-500/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30 text-green-100">AI-POWERED AUDIT</span>
                        </div>
                    </div>
                    {/* Subject Selector */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl flex flex-col gap-2 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Mata Pelajaran</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer appearance-none"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.name} className="bg-indigo-900 text-white">{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Progress Timeline Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">Progres Audit Akademik</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{completedCount} dari {CHAPTERS.length} Bab Telah Disusun</p>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{completionPercentage}%</span>
                    </div>
                </div>

                <div className="relative px-4">
                    {/* Background Line */}
                    <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 dark:bg-gray-700 -z-0 rounded-full" />

                    <div className="relative z-10 flex justify-between">
                        {CHAPTERS.map((chap) => {
                            const isDone = !!chaptersContent[chap.id];
                            const isActive = activeChapter === chap.id;

                            return (
                                <div key={chap.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setActiveChapter(chap.id)}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-4 ${isDone ? 'bg-green-500 border-green-100 dark:border-green-900/30 text-white shadow-lg shadow-green-200 dark:shadow-none' :
                                        isActive ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/30 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110' :
                                            'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                                        }`}>
                                        {isDone ? <ShieldCheck size={18} /> : <span className="text-xs font-black">{chap.id}</span>}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter hidden md:block ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                                        }`}>
                                        Bab {chap.id}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Sidebar Chapters Navigation */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Daftar Isi Laporan</h3>
                        <div className="space-y-2">
                            {CHAPTERS.map((chap) => (
                                <button
                                    key={chap.id}
                                    onClick={() => setActiveChapter(chap.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${activeChapter === chap.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                                        : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`${activeChapter === chap.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            {chap.icon}
                                        </div>
                                        <span className="text-xs font-bold text-left leading-tight">{chap.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {chaptersContent[chap.id] ? (
                                            <ShieldCheck size={16} className="text-green-500" />
                                        ) : (
                                            <div className="h-2 w-2 rounded-full bg-gray-300" />
                                        )}
                                        <ChevronRight size={14} className="opacity-50" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-5">
                        <div className="flex items-start gap-3">
                            <Zap size={20} className="text-amber-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">Tips Hemat Token</h4>
                                <p className="text-xs text-amber-700/80 dark:text-amber-400/60 leading-relaxed">
                                    Laporan ini dirancang untuk dibuat <b>bab demi bab</b>. Jika kuota harian AI Anda habis, simpan pekerjaan Anda dan lanjutkan bab berikutnya esok hari.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Editor Area */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-10 shadow-xl border border-gray-100 dark:border-gray-700 min-h-[600px] flex flex-col relative overflow-hidden">
                        {/* Header Content Area */}
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl text-indigo-600">
                                    {CHAPTERS.find(c => c.id === activeChapter)?.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">
                                        {CHAPTERS.find(c => c.id === activeChapter)?.title}
                                    </h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Draf Editor v1.0 • Smartty Generated</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {currentDraft && (
                                    <button
                                        onClick={() => handleDeleteChapter(activeChapter)}
                                        className="p-3 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/50"
                                        title="Hapus Konten Bab Ini"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100`}
                                >
                                    {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    <span>{currentDraft ? 'Regenerate Draf' : 'Generate Draf'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Editor / Content */}
                        <div className="flex-1 flex flex-col gap-8">

                            {/* Always visible Visual Chart Section for chapters with data */}
                            {activeChapter >= 1 && activeChapter <= 5 && (
                                <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart size={16} className="text-indigo-600" />
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                            Visualisasi Data Pendukung Bab {activeChapter}
                                        </span>
                                    </div>
                                    {isLiveContextLoading[activeChapter] ? (
                                        <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-indigo-400" /></div>
                                    ) : (
                                        <VisualAnalytics
                                            chapterId={activeChapter}
                                            data={liveContextData[activeChapter] || chaptersContent[activeChapter]?.context || {}}
                                        />
                                    )}
                                </div>
                            )}

                            {currentDraft ? (
                                <>
                                    <div className="prose dark:prose-invert max-w-none prose-indigo markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {currentDraft}
                                        </ReactMarkdown>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <div className="p-6 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-6">
                                        <Bot size={48} className="text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Belum Ada Konten</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                                        Smartty AI siap membantu menyusun narasi profesional untuk <b>{CHAPTERS.find(c => c.id === activeChapter)?.title}</b> berdasarkan data semester ini.
                                    </p>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-indigo-600 font-bold rounded-2xl shadow-xl hover:scale-105 transition-all border border-indigo-100 dark:border-indigo-900 disabled:opacity-50"
                                    >
                                        <Zap size={20} className="fill-current" />
                                        <span>Mulai Susun Bab Ini Sekarang</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer Content Area - Download Options */}
                        {currentDraft && (
                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Terakhir diperbarui: {chaptersContent[activeChapter]?.updatedAt?.toDate ? chaptersContent[activeChapter].updatedAt.toDate().toLocaleString() : 'Baru saja'}</p>
                                    <button
                                        onClick={handleExportWord}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all font-sans uppercase tracking-widest text-[10px]"
                                    >
                                        <Download size={14} />
                                        <span>Download Bab Ini (.docx)</span>
                                    </button>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-700">
                                            <Book size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Kompilasi Seluruh Bab</h4>
                                            <p className="text-[10px] text-gray-500">Gabungkan semua bab menjadi satu file Word.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleExportFullReport}
                                        className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-bold text-xs shadow-md"
                                    >
                                        Download Buku Laporan (.docx)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Elegant Delete Confirmation Modal */}
            {confirmDeleteModal.isOpen && (
                <Modal onClose={() => setConfirmDeleteModal({ isOpen: false, chapterId: null })}>
                    <div className="text-center p-2">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-red-50 dark:bg-red-900/20 mb-6 animate-pulse">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                            Hapus Konten Bab?
                        </h3>

                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
                            Tindakan ini akan menghapus permanen narasi AI pada <span className="text-red-500 font-bold">Bab {confirmDeleteModal.chapterId}</span>. Data dasar tetap aman.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmDelete}
                                className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300 active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                Ya, Hapus Permanen
                            </button>

                            <button
                                onClick={() => setConfirmDeleteModal({ isOpen: false, chapterId: null })}
                                className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 text-xs uppercase tracking-widest"
                            >
                                Batalkan
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
