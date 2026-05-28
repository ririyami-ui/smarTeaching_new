import React, { useState, useEffect, useCallback } from 'react';
import {
    Book, Sparkles, Send, Download, Save, RefreshCw, ChevronRight, FileText,
    PieChart, BarChart, ShieldCheck, Zap, Bot, Loader, Trash2, AlertTriangle
} from 'lucide-react';
import Modal from '../components/Modal';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useSettings } from '../utils/SettingsContext';
import { generatePortfolioChapter } from '../utils/ai/portfolioService';
import toast from 'react-hot-toast';
import VisualAnalytics from '../components/portfolio/VisualAnalytics';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../utils/dateUtils';

interface Chapter {
    id: number;
    title: string;
    icon: React.ReactNode;
}

interface ChapterData {
    content: string;
    context: Record<string, unknown>;
    status: string;
    updatedAt: Date;
}

const CHAPTERS: Chapter[] = [
    { id: 1, title: 'BAB I: PENDAHULUAN', icon: <Book size={20} /> },
    { id: 2, title: 'BAB II: PEMETAAN KURIKULUM & TARGET', icon: <FileText size={20} /> },
    { id: 3, title: 'BAB III: STRATEGI PEMBELAJARAN (PEDAGOGY)', icon: <Zap size={20} /> },
    { id: 4, title: 'BAB IV: ANALISIS HASIL BELAJAR (MAPEL)', icon: <PieChart size={20} /> },
    { id: 5, title: 'BAB V: DISIPLIN AKADEMIK & ETIKA', icon: <ShieldCheck size={20} /> },
    { id: 6, title: 'BAB VI: EVALUASI PERIODE (SWOT)', icon: <Bot size={20} /> },
    { id: 7, title: 'BAB VII: PENUTUP & REKOMENDASI', icon: <Sparkles size={20} /> },
];

export default function PortfolioPage() {
    const { user } = useAuth();
    const { activeSemester, academicYear } = useSettings();
    const [activeChapter, setActiveChapter] = useState<number>(1);
    const [chaptersContent, setChaptersContent] = useState<Record<number, ChapterData>>({});
    const [liveContextData, setLiveContextData] = useState<Record<number, Record<string, unknown>>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [, setIsLiveContextLoading] = useState<Record<number, boolean>>({});
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; chapterId: number | null }>({ isOpen: false, chapterId: null });
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [fullReportCaptureState, setFullReportCaptureState] = useState<{ chapterId: number; data: Record<string, unknown> } | null>(null);

    const completedCount = Object.keys(chaptersContent).length;
    const completionPercentage = Math.round((completedCount / CHAPTERS.length) * 100);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Load subjects first
                const subQ = query(collection(db, 'subjects'), where('userId', '==', user.uid));
                const subSnap = await getDocs(subQ);
                const fetchedSub = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; name: string }));
                setSubjects(fetchedSub);
                if (fetchedSub.length > 0 && !selectedSubject) {
                    setSelectedSubject(fetchedSub[0].name);
                }

                // Load teacher profile
                const profileRef = doc(db, 'users', user.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    setUserProfile(profileSnap.data());
                }
            } catch {
                // Error loading data
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user, selectedSubject]);

    useEffect(() => {
        const loadPortfolio = async () => {
            if (!user || !selectedSubject) return;
            setIsLoading(true);
            try {
                const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
                const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
                const safeSubject = selectedSubject.replace(/\s+/g, '_');
                const docId = `${user.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
                const docRef = doc(db, 'semesterPortfolios', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setChaptersContent(docSnap.data().chapters || {});
                } else {
                    setChaptersContent({});
                }
            } catch {
                toast.error("Gagal memuat data portofolio.");
            } finally {
                setIsLoading(false);
            }
        };
        loadPortfolio();
    }, [academicYear, activeSemester, selectedSubject, user]);

    const saveChapter = async (chapId: number, content: string, context: Record<string, unknown>) => {
        if (!user || !selectedSubject) return;
        try {
            const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
            const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${user.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
            const docRef = doc(db, 'semesterPortfolios', docId);

            const newChapterData: ChapterData = {
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
                    userId: user.uid,
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

    const handleDeleteChapter = (chapId: number) => {
        setConfirmDeleteModal({ isOpen: true, chapterId: chapId });
    };

    const confirmDelete = async () => {
        const chapId = confirmDeleteModal.chapterId;
        if (chapId === null || !user) return;
        setConfirmDeleteModal({ isOpen: false, chapterId: null });

        try {
            const safeYear = academicYear.replace(/\//g, '_');
            const safeSemester = activeSemester.replace(/\//g, '_');
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${user.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
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

    const gatherContext = useCallback(async (chapId: number) => {
        const uid = user?.uid;
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
                    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                    const byAssessment: Record<string, { total: number; count: number }> = {};
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
                    const byClass: Record<string, { total: number; count: number; missing: number }> = {};
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

                    snap_grades.docs.forEach(docSnap => {
                        totalAssignments++;
                        const score = docSnap.data().score;
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

                    snap_journals.docs.forEach(docSnap => {
                        const dat = docSnap.data();
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
                    const snap_swot = await getDocs(q);
                    const docs = snap_swot.docs.map(d => ({
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
    }, [selectedSubject, user, academicYear, activeSemester, userProfile]);

    // Auto-fetch context specifically for rendering graphs without waiting for AI generation
    useEffect(() => {
        const fetchLiveContext = async () => {
            if (!activeChapter || !selectedSubject || !academicYear || !activeSemester || !user?.uid) return;

            setIsLiveContextLoading(prev => ({ ...prev, [activeChapter]: true }));
            const context = await gatherContext(activeChapter);
            setLiveContextData(prev => ({ ...prev, [activeChapter]: context as unknown as Record<string, unknown> }));
            setIsLiveContextLoading(prev => ({ ...prev, [activeChapter]: false }));
        };
        fetchLiveContext();
    }, [activeChapter, selectedSubject, academicYear, activeSemester, gatherContext, user?.uid]);

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        const loadingToast = toast.loading(`Sedang menyusun ${CHAPTERS.find(c => c.id === activeChapter)?.title}...`);

        try {
            // Use live cached context if available, else fetch
            const context: Record<string, unknown> = liveContextData[activeChapter] || await gatherContext(activeChapter) || {};
            const content = await generatePortfolioChapter(activeChapter, context, userProfile as Record<string, unknown>, selectedSubject, chaptersContent);
            await saveChapter(activeChapter, content, context);
            toast.success(`Bab ${activeChapter} berhasil disusun!`, { id: loadingToast });
        } catch (error: unknown) {
            console.error("Generation error:", error);
            const errorMsg = error instanceof Error && error.message.includes('503')
                ? "Server AI sedang sibuk (Overload). Silakan coba lagi dalam beberapa saat."
                : (error instanceof Error ? error.message : "Gagal menyusun bab.");
            toast.error(errorMsg, { id: loadingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportWord = async () => {
        const content = chaptersContent[activeChapter]?.content;
        if (!content) return;

        const loadingToast = toast.loading("Menyiapkan dokumen Word...");
        try {
            let chartImageHtml = '';
            const chartElement = document.getElementById('chart-to-export');

            if (chartElement) {
                // Capture chart using html2canvas
                const canvas = await html2canvas(chartElement, {
                    scale: 2, // Higher quality
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });
                const imageData = canvas.toDataURL('image/png');
                chartImageHtml = `
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="${imageData}" style="width: 100%; max-width: 650px;" />
                        <p style="font-size: 9pt; color: #666; font-style: italic; margin-top: 5px;">
                            Gambar ${activeChapter}.1: Analisis Visual Data Semester Ini
                        </p>
                    </div>
                `;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head><meta charset="utf-8"></head>
                    <body>
                        <h1 style="text-align: center; color: #1e1b4b; font-family: 'Arial', sans-serif;">
                            ${CHAPTERS.find(c => c.id === activeChapter)?.title}
                        </h1>
                        <p style="text-align: center; color: #4b5563; font-family: 'Arial', sans-serif;">
                            <i>Semester: ${activeSemester} | Tahun Ajaran: ${academicYear} | Fokus: ${selectedSubject}</i>
                        </p>
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                        
                        <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;">
                            ${markdownToHtml(content.replace(/\[VISUAL_CHART\]/g, chartImageHtml))}
                        </div>
                    </body>
                </html>
            `;

            const blob = await asBlob(htmlContent);
            saveAs(blob, `Portofolio_Bab_${activeChapter}_${academicYear}_S${activeSemester}.docx`);
            toast.success("File Word berhasil diunduh.", { id: loadingToast });
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal menyusun dokumen Word.", { id: loadingToast });
        }
    };

    // Convert Markdown to HTML for Word export (handles tables, headings, lists, bold, italic)
    const markdownToHtml = (md: string) => {
        if (!md) return '';
        let html = md;

        // ---- Tables ----
        html = html.replace(/^(\|.+\|[ \t]*)\n(\|[-| :]+\|[ \t]*)\n((\|.+\|[ \t]*\n?)+)/gm, (match, header, separator, body) => {
            const headers = header.split('|').map((c: string) => c.trim()).filter(Boolean);
            const rows = body.trim().split('\n').map((row: string) =>
                row.split('|').map((c: string) => c.trim()).filter(Boolean)
            );
            const thead = `<tr>${headers.map((h: string) => `<th style="border:1px solid #999;padding:6px;background:#f2f2f2;font-weight:bold">${h}</th>`).join('')}</tr>`;
            const tbody = rows.map((row: string[]) =>
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
        if (!user) return;
        setIsLoading(true);
        const loadingToast = toast.loading("Menyiapkan Laporan Lengkap... Ini mungkin memakan waktu beberapa saat.");
        try {
            const safeYear = academicYear?.replace(/\//g, '_') || 'unknown';
            const safeSemester = activeSemester?.replace(/\//g, '_') || 'unknown';
            const safeSubject = selectedSubject.replace(/\s+/g, '_');
            const docId = `${user.uid}_${safeYear}_${safeSemester}_${safeSubject}`;
            const docRef = doc(db, 'semesterPortfolios', docId);
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                toast.error("Data portofolio belum tersedia.", { id: loadingToast });
                setIsLoading(false);
                return;
            }

            const chapters = snap.data().chapters || {};
            const chartImages: Record<number, string> = {};

            // ---- Step 1: Sequential Snapshot Capture for all chapters with charts ----
            for (const chap of CHAPTERS) {
                const chapterData = chapters[chap.id];
                if ([2, 3, 4, 5, 6].includes(chap.id) && chapterData?.context && chapterData?.content?.includes('[VISUAL_CHART]')) {
                    toast.loading(`Mengambil Visualisasi untuk ${chap.title}...`, { id: loadingToast });

                    // Trigger hidden render
                    setFullReportCaptureState({ chapterId: chap.id, data: chapterData.context });

                    // Wait for Recharts animation to stabilize (800ms)
                    await new Promise(resolve => setTimeout(resolve, 800));

                    const chartBuffer = document.getElementById('full-report-chart-buffer');
                    if (chartBuffer) {
                        try {
                            const canvas = await html2canvas(chartBuffer, {
                                scale: 2,
                                useCORS: true,
                                backgroundColor: '#ffffff',
                                logging: false
                            });
                            chartImages[chap.id] = canvas.toDataURL('image/png');
                        } catch (err) {
                            console.error(`Failed to capture chart for chapter ${chap.id}`, err);
                        }
                    }
                }
            }

            setFullReportCaptureState(null); // Clean up
            toast.loading("Menyusun dokumen final...", { id: loadingToast });

            let combinedHtml = `
                <!DOCTYPE html>
                <html>
                    <head><meta charset="utf-8"></head>
                    <body>
                        <h1 style="text-align: center; font-size: 24pt; color: #1e1b4b; font-family: 'Arial', sans-serif;">
                            LAPORAN PORTOFOLIO AKADEMIK
                        </h1>
                        <p style="text-align: center; font-size: 14pt; color: #4b5563;">
                            ${academicYear} - Semester ${activeSemester}
                        </p>
                        <p style="text-align: center; font-size: 12pt; color: #6366f1; font-weight: bold;">
                            Bidang Studi: ${selectedSubject}
                        </p>
                        <br><br>
            `;

            CHAPTERS.forEach(chap => {
                if (chapters[chap.id]) {
                    let chapterContent = chapters[chap.id].content;

                    // Replace placeholder with captured image if exists
                    if (chartImages[chap.id]) {
                        const imgHtml = `
                            <div style="text-align: center; margin: 25px 0; border: 1px solid #f3f4f6; padding: 15px; border-radius: 8px;">
                                <img src="${chartImages[chap.id]}" style="width: 100%; max-width: 650px;" />
                                <p style="font-size: 9pt; color: #6b7280; font-style: italic; margin-top: 10px;">
                                    Gambar ${chap.id}.1: Analisis Visual Data Semester Ini
                                </p>
                            </div>
                        `;
                        chapterContent = chapterContent.replace(/\[VISUAL_CHART\]/g, imgHtml);
                    } else {
                        // Strip remaining placeholders if no images captured
                        chapterContent = chapterContent.replace(/\[VISUAL_CHART\]/g, '');
                    }

                    combinedHtml += `
                        <div style="page-break-before: always; margin-top: 30px;">
                            <h2 style="color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-family: 'Arial', sans-serif;">
                                ${chap.title}
                            </h2>
                            <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; text-align: justify;">
                                ${markdownToHtml(chapterContent)}
                            </div>
                        </div>
                    `;
                }
            });

            combinedHtml += `</body></html>`;

            const blob = await asBlob(combinedHtml);
            saveAs(blob, `Laporan_Lengkap_Portofolio_${academicYear}_S${activeSemester}.docx`);
            toast.success("Laporan Lengkap berhasil diunduh.", { id: loadingToast });
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal mengunduh laporan lengkap.", { id: loadingToast });
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
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600/90 to-purple-700/90 dark:from-indigo-950/80 dark:to-purple-950/80 backdrop-blur-xl rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/20">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Book size={200} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="glass-icon-container glass-glow-blue w-14 h-14 p-2 relative">
                                <Book size={32} className="opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none rounded-2xl"></div>
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Smartty Portofolio</h1>
                                <p className="text-indigo-100 text-lg font-medium opacity-80">Audit Akademik & Laporan Kinerja Professional</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/20">TA {academicYear} • SMTR {activeSemester?.toUpperCase()}</span>
                            <span className="px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/30 text-green-200">AI-POWERED AUDIT</span>
                        </div>
                    </div>
                    {/* Subject Selector */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[2rem] flex flex-col gap-2 min-w-[220px] shadow-inner">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-80">Mata Pelajaran</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer appearance-none text-lg p-0"
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

                            {currentDraft ? (
                                <>
                                    <div className="prose dark:prose-invert max-w-none prose-indigo markdown-content">
                                        {[2, 3, 4, 5, 6].includes(activeChapter) && currentDraft.includes('[VISUAL_CHART]') ? (
                                            (() => {
                                                const parts = currentDraft.split('[VISUAL_CHART]');
                                                const firstPart = parts[0];
                                                const remainingParts = parts.slice(1).join('\n'); // Join the rest without placeholders

                                                return (
                                                    <>
                                                        {firstPart && (
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {firstPart}
                                                            </ReactMarkdown>
                                                        )}
                                                        <div id="chart-to-export" className="my-10 bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm no-print">
                                                            <div className="flex items-center gap-2 mb-6 border-l-4 border-indigo-600 pl-4">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Visualisasi Data Utama</p>
                                                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                                        {activeChapter === 2 ? 'Pemetaan Kurikulum & Target' :
                                                                            activeChapter === 3 ? 'Konsistensi Pelaksanaan Pembelajaran' :
                                                                                activeChapter === 4 ? 'Distribusi Capaian Kurikulum' :
                                                                                    activeChapter === 5 ? 'Analisis Kedisiplinan & Etika Peserta Didik' :
                                                                                        'Analisis Kekuatan, Kelemahan & Peluang (SWOT)'}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <VisualAnalytics
                                                                chapterId={activeChapter}
                                                                data={liveContextData[activeChapter] || chaptersContent[activeChapter]?.context || {}}
                                                            />
                                                            <p className="text-center text-[10px] text-gray-400 mt-4 italic font-medium uppercase tracking-widest leading-loose">
                                                                Gambar {activeChapter}.1: Analisis Kuantitatif Semester Ini
                                                            </p>
                                                        </div>
                                                        {remainingParts && (
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {remainingParts}
                                                            </ReactMarkdown>
                                                        )}
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {currentDraft}
                                            </ReactMarkdown>
                                        )}
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
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Terakhir diperbarui: {chaptersContent[activeChapter]?.updatedAt ? formatDateTime(chaptersContent[activeChapter].updatedAt) : 'Baru saja'}</p>
                                    <button
                                        onClick={handleExportWord}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all font-sans uppercase tracking-widest text-[10px]"
                                    >
                                        <Download size={14} />
                                        <span>Download Word (Bab {activeChapter})</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Full Report Export Card */}
                    {completedCount > 0 && (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-[2rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                                    <Send size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Export Laporan Lengkap</h3>
                                    <p className="text-green-100 text-sm opacity-90 font-medium">Gabungkan semua bab yang telah selesai menjadi satu dokumen audit profesional.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleExportFullReport}
                                className="px-8 py-4 bg-white text-green-700 font-black rounded-2xl hover:scale-105 transition-all shadow-lg uppercase tracking-widest text-xs"
                            >
                                Generate Full Audit
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Buffer for Full Report Chart Captures */}
            {fullReportCaptureState && (
                <div className="fixed -left-[2000px] top-0 w-[800px] bg-white p-10 z-[-100]">
                    <div id="full-report-chart-buffer">
                        <h4 className="text-lg font-bold mb-6 text-center text-indigo-900 border-b pb-4">
                            {CHAPTERS.find(c => c.id === fullReportCaptureState.chapterId)?.title}
                        </h4>
                        <VisualAnalytics
                            chapterId={fullReportCaptureState.chapterId}
                            data={fullReportCaptureState.data}
                        />
                        <p className="text-center text-xs text-gray-400 mt-6 italic">
                            Visualisasi Data Otomatis - TA {academicYear}
                        </p>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            {confirmDeleteModal.isOpen && (
                <Modal
                    onClose={() => setConfirmDeleteModal({ isOpen: false, chapterId: null })}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <p className="text-sm text-red-700 dark:text-red-400">
                                Tindakan ini akan menghapus narasi yang telah disusun oleh AI untuk bab ini secara permanen dari database.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setConfirmDeleteModal({ isOpen: false, chapterId: null })}
                                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

