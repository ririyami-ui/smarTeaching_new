import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../utils/SettingsContext';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    serverTimestamp,
    orderBy,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { toHanacaraka, getRegionFromSubject } from '../utils/carakan';
import {
    FileText,
    Sparkles,
    Save,
    Trash2,
    Eye,
    ChevronRight,
    Search,
    BookOpen,
    History,
    Loader2,
    Printer,
    Download,
    MapPin,
    ClipboardList,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import { generateLessonPlan } from '../utils/gemini';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const LessonPlanPage = () => {
    const { activeSemester, academicYear, geminiModel } = useSettings();
    const navigate = useNavigate();
    const [levels, setLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [promesMaterials, setPromesMaterials] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [sourceType, setSourceType] = useState('promes'); // 'promes' or 'atp'
    const [atpMaterials, setAtpMaterials] = useState([]);
    const [teachingModel, setTeachingModel] = useState('Otomatis');
    const [assessmentModel, setAssessmentModel] = useState('Otomatis'); // New State: Model KKTP

    // Prepopulate from URL if coming from Schedule
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qGrade = params.get('grade');
        const qSubject = params.get('subject');
        const qTopic = params.get('topic');

        if (qGrade) setSelectedGrade(qGrade);
        if (qSubject) setSelectedSubject(qSubject);
        if (qTopic) {
            setManualMateri(qTopic);
            setManualKd(qTopic); // Fallback KD to topic if not specific
        }
    }, [levels, subjects]); // Re-run when masters load if needed

    const [generatedRPP, setGeneratedRPP] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedRPPs, setSavedRPPs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingRPP, setViewingRPP] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const [manualKd, setManualKd] = useState('');
    const [manualMateri, setManualMateri] = useState('');

    const [userProfile, setUserProfile] = useState({ name: '', school: '', nip: '', principalName: '', principalNip: '' });
    const [signingLocation, setSigningLocation] = useState('Jakarta');
    const [detectingLocation, setDetectingLocation] = useState(false);

    // Load saved location
    useEffect(() => {
        const saved = localStorage.getItem('QUIZ_SIGNING_LOCATION');
        if (saved) setSigningLocation(saved);
    }, []);

    const [filterSubject, setFilterSubject] = useState('all');

    const filteredRPPs = savedRPPs.filter(plan => {
        if (filterSubject === 'all') return true;

        // Find the selected subject name to support backward compatibility
        const selectedSubjectDat = subjects.find(s => s.id === filterSubject);
        const selectedSubjectName = selectedSubjectDat ? selectedSubjectDat.name : '';

        // Match by ID OR by Name (for loose matching with older data)
        return plan.subjectId === filterSubject ||
            plan.subject === filterSubject ||
            (selectedSubjectName && plan.subject === selectedSubjectName);
    });

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Browser tidak mendukung geolokasi.");
            return;
        }

        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    const city = data.address.city || data.address.town || data.address.regency || data.address.county || 'Lokasi Terdeteksi';
                    setSigningLocation(city);
                    localStorage.setItem('QUIZ_SIGNING_LOCATION', city); // Share key with Quiz
                    toast.success(`Lokasi terdeteksi: ${city}`);
                } catch (error) {
                    console.error("Error detecting location:", error);
                    if (error.code === 1) toast.error("Izin lokasi ditolak. Cek pengaturan browser.");
                    else toast.error("Gagal mendeteksi nama kota.");
                } finally {
                    setDetectingLocation(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                if (error.code === 1) toast.error("Izin lokasi ditolak. Mohon izinkan browser.");
                else toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
                setDetectingLocation(false);
            }
        );
    };

    // Fetch Master Data
    useEffect(() => {
        const fetchMasters = async () => {
            if (!auth.currentUser) return;
            try {
                const classesQuery = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid));
                const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', auth.currentUser.uid));

                const [classesSnap, subjectsSnap] = await Promise.all([
                    getDocs(classesQuery),
                    getDocs(subjectsQuery)
                ]);

                const uniqueLevels = [...new Set(classesSnap.docs.map(doc => doc.data().level))].sort();
                const fetchedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name));

                setLevels(uniqueLevels);
                setSubjects(fetchedSubjects);

                if (uniqueLevels.length > 0) setSelectedGrade(uniqueLevels[0]);
                if (fetchedSubjects.length > 0) setSelectedSubject(fetchedSubjects[0].id);

                // Fetch User Profile
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    setUserProfile({
                        name: userDoc.data().name || '',
                        school: userDoc.data().school || '',
                        nip: userDoc.data().nip || '',
                        principalName: userDoc.data().principalName || '',
                        principalNip: userDoc.data().principalNip || ''
                    });
                }



            } catch (error) {
                console.error("Error fetching masters:", error);
                toast.error("Gagal memuat data master");
            }
        };
        fetchMasters();
    }, []);

    // Populate manual KD and Materi when a material is selected
    useEffect(() => {
        if (selectedMaterial) {
            setManualKd(selectedMaterial.kd || '');
            setManualMateri(selectedMaterial.materi || '');
        } else {
            setManualKd('');
            setManualMateri('');
        }
    }, [selectedMaterial]);

    // Fetch Materials based on sourceType
    useEffect(() => {
        const fetchMaterials = async () => {
            if (!auth.currentUser || !selectedGrade || !selectedSubject) return;

            // Reset selection when source/filter changes
            setSelectedMaterial(null);
            setGeneratedRPP('');

            if (sourceType === 'promes') {
                setPromesMaterials([]);
                try {
                    const subjectData = subjects.find(s => s.id === selectedSubject);
                    const subjectName = subjectData?.name || selectedSubject;
                    const yearId = academicYear.replace('/', '-');
                    const docId = `${auth.currentUser.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}`;
                    const docRef = doc(db, 'teachingPrograms', docId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const prota = data.prota || [];
                        const promes = data.promes || {};
                        const enhancedProta = prota.map(item => {
                            const distributions = [];
                            Object.keys(promes).forEach(key => {
                                if (key.startsWith(`${item.id}_`)) {
                                    const val = parseInt(promes[key]);
                                    if (val > 0) distributions.push(val);
                                }
                            });
                            return { ...item, distribution: distributions };
                        });
                        setPromesMaterials(enhancedProta);
                    } else {
                        const q = query(
                            collection(db, 'teachingPrograms'),
                            where('userId', '==', auth.currentUser.uid),
                            where('gradeLevel', '==', selectedGrade),
                            where('subject', '==', selectedSubject),
                            where('academicYear', '==', academicYear),
                            where('semester', '==', activeSemester),
                            where('type', '!=', 'atp_document')
                        );
                        const qSnap = await getDocs(q);
                        if (!qSnap.empty) {
                            const data = qSnap.docs[0].data();
                            const prota = data.prota || [];
                            const promes = data.promes || {};
                            const enhancedProta = prota.map(item => {
                                const distributions = [];
                                Object.keys(promes).forEach(key => {
                                    if (key.startsWith(`${item.id}_`)) {
                                        const val = parseInt(promes[key]);
                                        if (val > 0) distributions.push(val);
                                    }
                                });
                                return { ...item, distribution: distributions };
                            });
                            setPromesMaterials(enhancedProta);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching promes:", error);
                }
            } else {
                // ATP Mode
                setAtpMaterials([]);
                try {
                    const subjectData = subjects.find(s => s.id === selectedSubject);
                    const subjectName = subjectData?.name || selectedSubject;
                    const yearId = academicYear.replace('/', '-');

                    // 1. Fetch ATP Document
                    const atpId = `${auth.currentUser.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}_ATP`;
                    const atpSnap = await getDoc(doc(db, 'teachingPrograms', atpId));

                    // 2. Fetch main Teaching Program to get Promes distribution
                    const mainDocId = `${auth.currentUser.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}`;
                    const mainDocSnap = await getDoc(doc(db, 'teachingPrograms', mainDocId));
                    const promes = mainDocSnap.exists() ? mainDocSnap.data().promes || {} : {};

                    if (atpSnap.exists() && atpSnap.data().atpItems) {
                        const items = atpSnap.data().atpItems;

                        // Enhance ATP items with distribution from Promes
                        // We map based on index since Sync from ATP uses (index + 1) as ID in Prota
                        const enhancedAtp = items.map((item, index) => {
                            const protaId = index + 1;
                            const distributions = [];
                            Object.keys(promes).forEach(key => {
                                if (key.startsWith(`${protaId}_`)) {
                                    const val = parseInt(promes[key]);
                                    if (val > 0) distributions.push(val);
                                }
                            });
                            return { ...item, id: protaId, distribution: distributions };
                        });

                        setAtpMaterials(enhancedAtp);
                    }
                } catch (error) {
                    console.error("Error fetching ATP:", error);
                }
            }
        };
        fetchMaterials();
    }, [selectedGrade, selectedSubject, activeSemester, academicYear, sourceType]);

    // Fetch Saved RPPs
    const fetchRPPHistory = useCallback(async () => {
        if (!auth.currentUser) return;
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, 'lessonPlans'),
                where('userId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedRPPs(plans);
        } catch (error) {
            console.error("Error fetching RPP history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchRPPHistory();
    }, [fetchRPPHistory]);

    const handleGenerate = async () => {
        if (!selectedMaterial) {
            toast.error("Pilih materi atau butir ATP terlebih dahulu");
            return;
        }

        setIsGenerating(true);
        setViewingRPP(null);
        try {
            const subjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectData?.name || selectedSubject;

            const result = await generateLessonPlan({
                kd: manualKd || selectedMaterial.kd || selectedMaterial.tp,
                materi: manualMateri || selectedMaterial.materi,
                gradeLevel: selectedGrade,
                subject: subjectName,
                academicYear,
                semester: activeSemester,
                teacherName: userProfile.name,
                teacherNip: userProfile.nip,
                schoolName: userProfile.school,
                principalName: userProfile.principalName,
                principalNip: userProfile.principalNip,
                jp: selectedMaterial.jp,
                distribution: selectedMaterial.distribution,
                teachingModel: teachingModel,
                assessmentModel: assessmentModel,
                modelName: geminiModel,
                sourceType: sourceType, // Pass sourceType to AI
                elemen: selectedMaterial.elemen || '',
                profilLulusan: selectedMaterial.profilLulusan || '' // Pass ATP's Profil Lulusan
            });
            const cleanResult = result.replace(/\|\|/g, '');
            setGeneratedRPP(cleanResult);
            toast.success("RPP berhasil disusun oleh AI!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!generatedRPP) return;
        setIsSaving(true);
        try {
            const subjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectData?.name || selectedSubject;

            await addDoc(collection(db, 'lessonPlans'), {
                userId: auth.currentUser.uid,
                subjectId: selectedSubject,
                subject: subjectName,
                gradeLevel: selectedGrade,
                topic: manualMateri || selectedMaterial.materi,
                kd: manualKd || selectedMaterial.kd,
                content: generatedRPP,
                assessmentModel,
                academicYear,
                semester: activeSemester,
                createdAt: serverTimestamp()
            });
            toast.success("RPP berhasil disimpan ke riwayat!");
            fetchRPPHistory();

        } catch (error) {
            toast.error("Gagal menyimpan RPP");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus RPP',
            message: 'HAPUS RIWAYAT: Apakah Anda yakin ingin menghapus RPP ini dari riwayat?',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'lessonPlans', id));
                    toast.success("RPP dihapus");
                    fetchRPPHistory();
                    if (viewingRPP?.id === id) setViewingRPP(null);
                } catch (error) {
                    toast.error("Gagal menghapus");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };


    const handleDownloadDocx = async () => {
        const content = document.getElementById('printable-area');
        if (!content) return;

        // Clone content to modify for export without affecting display
        const clone = content.cloneNode(true);

        // Remove buttons/UI from clone if any exist (though print styles handle this, explicit removal is safer for docx)
        const uiElements = clone.querySelectorAll('button, .no-print');
        uiElements.forEach(el => el.remove());

        // Remove on-screen signature (CSS Grid doesn't work in Word)
        const onScreenSig = clone.querySelector('#signature-section');
        if (onScreenSig) onScreenSig.remove();

        // Get HTML string
        const htmlString = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        font-size: 11pt; 
                        line-height: 1.5;
                        color: #000;
                    }
                    h1 { text-align: center; text-transform: uppercase; font-size: 14pt; border-bottom: 3px double #000; padding-bottom: 5px; }
                    h2 { text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 20px; }
                    h3 { border-bottom: 1px solid #ccc; padding-bottom: 2px; font-size: 11pt; margin-top: 15px; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid black; padding: 8px; font-size: 11pt; color: #000; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    p { margin-bottom: 10px; text-align: justify; }
                    ol, ul { padding-left: 30px; }
                    li { margin-bottom: 5px; }
                    /* Signature table no borders */
                    table:last-of-type, table:last-of-type td, table:last-of-type th { border: none !important; }
                </style>
            </head>
            <body>
                <div class="rpp-prose">
                    ${clone.innerHTML}
                </div>
                
                <table style="border: none; margin-top: 50px; width: 100%;">
                    <tr style="border: none;">
                        <td align="center" style="border: none; width: 50%;">
                            Mengetahui,<br/>
                            Kepala Sekolah
                            <br/><br/><br/><br/>
                            <strong>${userProfile.principalName || '.....................................'}</strong><br/>
                            NIP. ${userProfile.principalNip || '...................'}
                        </td>
                        <td align="center" style="border: none; width: 50%;">
                            ${signingLocation || 'Jakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                            Guru Mata Pelajaran
                            <br/><br/><br/><br/>
                            <strong>${userProfile.name || '.....................................'}</strong><br/>
                            NIP. ${userProfile.nip || '...................'}
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        try {
            const subjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectData?.name || selectedSubject;
            const topicName = (viewingRPP ? viewingRPP.topic : manualMateri || selectedMaterial?.materi || 'Materi').substring(0, 30);

            // Clean filename from illegal characters
            const safeSubject = subjectName.replace(/[/\\?%*:|"<>]/g, '-');
            const safeTopic = topicName.replace(/[/\\?%*:|"<>]/g, '-');
            const safeGrade = String(selectedGrade).replace(/[/\\?%*:|"<>]/g, '-');

            const converted = await asBlob(htmlString);
            const fileName = `RPP_${safeSubject}_${safeGrade}_${safeTopic}.docx`;
            saveAs(converted, fileName);
            toast.success("RPP sedang didownload (.docx)");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Gagal membuat file Word");
        }

    };

    // --- LKPD Logic ---


    return (
        <div className="max-w-[1500px] mx-auto px-4 py-4 lg:py-8 min-h-screen print:m-0 print:p-0 print:max-w-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 lg:mb-8 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-800 dark:text-blue-100 flex items-center gap-3">
                        <Sparkles className="text-blue-600 animate-pulse" />
                        Penyusunan RPP AI
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Susun rencana pembelajaran otomatis berdasarkan data Promes Anda.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
                {/* Input Control */}
                <div className="lg:col-span-1 space-y-6 no-print lg:sticky lg:top-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Search size={20} className="text-blue-500" />
                            Pilih Sumber Materi
                        </h3>

                        <StyledSelect
                            label="Kelas"
                            value={selectedGrade}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                        >
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </StyledSelect>

                        <StyledSelect
                            label="Mata Pelajaran"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex justify-between items-center">
                                <span>Materi Pokok / ATP</span>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg border dark:border-gray-600 scale-90 origin-right">
                                    <button
                                        onClick={() => setSourceType('promes')}
                                        className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${sourceType === 'promes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}
                                    >Promes</button>
                                    <button
                                        onClick={() => setSourceType('atp')}
                                        className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${sourceType === 'atp' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'}`}
                                    >ATP</button>
                                </div>
                            </label>
                            <div className="max-h-64 overflow-y-auto border dark:border-gray-600 rounded-xl divide-y dark:divide-gray-700">
                                {sourceType === 'atp' ? (
                                    atpMaterials.length > 0 ? (
                                        atpMaterials.map((m, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedMaterial(m);
                                                    setManualKd(m.tp || '');
                                                    setManualMateri(m.materi || '');
                                                }}
                                                className={`w-full text-left p-3 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/10 ${selectedMaterial === m ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold border-l-4 border-purple-500' : 'text-gray-600 dark:text-gray-400'}`}
                                            >
                                                <div className="text-[10px] uppercase font-bold opacity-60 mb-1">{m.elemen}</div>
                                                <div className="text-xs line-clamp-2 leading-relaxed">{m.tp}</div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    <span className="text-[9px] bg-purple-50 dark:bg-purple-900/40 px-1.5 py-0.5 rounded text-purple-600">{m.jp} JP</span>
                                                    {m.materi && <span className="text-[9px] italic opacity-70">L. Materi: {m.materi}</span>}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center">
                                            <p className="text-xs text-gray-400">Data ATP tidak ditemukan.</p>
                                            <p className="text-[10px] text-gray-400 mt-1">Pastikan Anda sudah menyusun ATP di halaman Program Mengajar.</p>
                                        </div>
                                    )
                                ) : (
                                    promesMaterials.length > 0 ? (
                                        promesMaterials.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setSelectedMaterial(m);
                                                    setManualKd(m.kd || '');
                                                    setManualMateri(m.materi || '');
                                                }}
                                                className={`w-full text-left p-3 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${selectedMaterial?.id === m.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
                                            >
                                                {m.materi}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center">
                                            <p className="text-xs text-gray-400">Data Promes tidak ditemukan.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {selectedMaterial && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Kompetensi Dasar / CP (Dapat Diedit)</label>
                                    <textarea
                                        value={manualKd}
                                        onChange={(e) => setManualKd(e.target.value)}
                                        rows={3}
                                        className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Masukkan KD/CP..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Materi Pokok (Dapat Diedit)</label>
                                    <textarea
                                        value={manualMateri}
                                        onChange={(e) => setManualMateri(e.target.value)}
                                        rows={2}
                                        className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Masukkan Materi Pokok..."
                                    />
                                </div>
                            </div>
                        )}

                        <StyledSelect
                            label="Model Pembelajaran"
                            value={teachingModel}
                            onChange={(e) => setTeachingModel(e.target.value)}
                        >
                            <option value="Otomatis">Otomatis (Pilihan Terbaik AI)</option>
                            {BSKAP_DATA.pedagogis.preferred_models.map(m => (
                                <option key={m.name} value={m.name}>{m.name}</option>
                            ))}
                            <option value="Cooperative Learning">Cooperative Learning</option>
                            <option value="Ceramah Plus">Ceramah Plus / Ekspositori</option>
                        </StyledSelect>

                        <StyledSelect
                            label="Pendekatan Asesmen (KKTP)"
                            value={assessmentModel}
                            onChange={(e) => setAssessmentModel(e.target.value)}
                        >
                            <option value="Otomatis">Otomatis (Pilihan Terbaik AI)</option>
                            {BSKAP_DATA.kktp_standards.methods.map(m => (
                                <option key={m.type} value={m.type}>{m.type}</option>
                            ))}
                        </StyledSelect>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">Kota (Tanda Tangan)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    value={signingLocation}
                                    onChange={(e) => {
                                        setSigningLocation(e.target.value);
                                        localStorage.setItem('QUIZ_SIGNING_LOCATION', e.target.value);
                                    }}
                                    placeholder="Contoh: Jakarta"
                                />
                                <button
                                    onClick={handleDetectLocation}
                                    disabled={detectingLocation}
                                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                                    title="Deteksi Lokasi Otomatis"
                                >
                                    {detectingLocation ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                                </button>
                            </div>
                        </div>

                        <StyledButton
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedMaterial}
                            variant="ai"
                            className="w-full flex items-center justify-center gap-2 py-3"
                        >
                            {isGenerating ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Sparkles size={18} />
                            )}
                            {isGenerating ? 'Menyusun RPP...' : 'Generate RPP AI'}
                        </StyledButton>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4 no-print">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <History size={20} className="text-purple-500" />
                            Riwayat RPP
                        </h3>

                        {/* Filter Dropdown */}
                        <div className="mb-2">
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="w-full p-2 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="all">Semua Mata Pelajaran</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {loadingHistory ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-300" /></div>
                            ) : filteredRPPs.length > 0 ? (
                                filteredRPPs.map((plan) => (
                                    <div key={plan.id} className="group relative bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="cursor-pointer flex-1" onClick={() => {
                                                setViewingRPP(plan);
                                                setGeneratedRPP('');
                                            }}>
                                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{plan.gradeLevel} - {plan.subject}</p>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{plan.topic}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{new Date(plan.createdAt?.toDate()).toLocaleDateString('id-ID')}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/penilaian-kktp');
                                                    }}
                                                    className="text-blue-400 hover:text-blue-600 p-1"
                                                    title="Lakukan Penilaian Digital"
                                                >
                                                    <ClipboardList size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(plan.id)} className="text-red-400 hover:text-red-600 p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-gray-400 py-10">
                                    {filterSubject === 'all' ? 'Belum ada RPP tersimpan.' : 'Tidak ada RPP untuk mapel ini.'}
                                </p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Display Area */}
                <div className="lg:col-span-3 flex flex-col h-[600px] lg:h-auto print:h-auto print:block print:w-full">
                    {isGenerating ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-xl border border-dashed border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <Loader2 className="animate-spin text-blue-500" size={64} />
                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Kecerdasan Buatan Sedang Menulis...</h2>
                            <p className="text-gray-500 text-center max-w-sm">Mohon tunggu sebentar, AI sedang menyusun langkah-langkah pembelajaran yang kreatif untuk Anda.</p>
                        </div>
                    ) : generatedRPP || viewingRPP ? (
                        <div id="printable-area" className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full print:m-0 print:p-0 print:block print:h-auto print:shadow-none print:border-none">
                            <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center no-print sticky top-0 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">
                                            Pratinjau RPP
                                        </span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {viewingRPP ? viewingRPP.topic : selectedMaterial?.materi}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={handleDownloadDocx} className="p-2.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-blue-600 dark:text-blue-400 hover:shadow-md" title="Download Word (.docx)">
                                        <Download size={18} />
                                    </button>

                                    {generatedRPP && (
                                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-bold text-sm transition-all disabled:opacity-50 shadow-md hover:shadow-lg">
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            Simpan RPP
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className={`p-8 lg:p-12 overflow-y-auto flex-1 rpp-prose max-w-none print:p-0 print:overflow-visible custom-scrollbar ${getRegionFromSubject(viewingRPP?.subject || selectedMaterial?.subject) === 'Jawa' ? 'font-carakan' : ''}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                >
                                    {generatedRPP || viewingRPP?.content}
                                </ReactMarkdown>

                                {/* Signature Section */}
                                <div id="signature-section" className="mt-12 pt-8 border-t border-transparent no-break-inside avoid-page-break">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p>Mengetahui,</p>
                                            <p className="font-bold mb-16">Kepala Sekolah</p>
                                            <p className="font-bold underline">{userProfile.principalName || '.....................................'}</p>
                                            <p>NIP. {userProfile.principalNip || '...................'}</p>
                                        </div>
                                        <div></div>
                                        <div>
                                            <p>{signingLocation || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                            <p className="font-bold mb-16">Guru Mata Pelajaran</p>
                                            <p className="font-bold underline">{userProfile.name || '.....................................'}</p>
                                            <p>NIP. {userProfile.name ? userProfile.nip : '...................'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                <BookOpen className="text-blue-600" size={64} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Mulai Susun RPP Deep Learning</h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                    Pilih materi pokok dari data Program Semester di sebelah kiri, lalu klik tombol **Generate** untuk menyusun RPP berbasis prinsip **Mindful, Meaningful, & Joyful**.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                                    <Sparkles size={14} /> Berbasis Kurikulum Deep Learning
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                                    <History size={14} /> Tersimpan Otomatis
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {
                confirmModal.isOpen && (
                    <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                <Trash2 className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

        </div >
    );
};

export default LessonPlanPage;

