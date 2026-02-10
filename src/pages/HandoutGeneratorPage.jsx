import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Use native listener
import { generateHandout } from '../utils/gemini';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import { BookOpen, Save, Download, Printer, Wand2, ArrowLeft, Search, History, Trash2, Clock, X, Eye, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getRegionFromSubject } from '../utils/carakan';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import Modal from '../components/Modal';

const HandoutGeneratorPage = () => {
    const [user, setUser] = useState(auth.currentUser);
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState(null);

    // Initialize Mermaid locally
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                primaryColor: '#6366f1', // Indigo 500
                primaryTextColor: '#1e293b', // Slate 800
                primaryBorderColor: '#4338ca', // Indigo 700
                lineColor: '#94a3b8', // Slate 400
                secondaryColor: '#f8fafc',
                tertiaryColor: '#ffffff',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '16px',
                mainBkg: '#ffffff',
                nodeBorder: '#6366f1',
                clusterBkg: '#f1f5f9',
            },
            flowchart: {
                curve: 'basis',
                padding: 40,
                nodeSpacing: 80, // Increased from 40
                rankSpacing: 80, // Increased from 40
                useMaxWidth: true
            }
        });
    }, []);

    // Local Mermaid Renderer Component
    const LocalMermaid = ({ content }) => {
        const [svg, setSvg] = useState('');
        const [error, setError] = useState(null);
        const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current;

        useEffect(() => {
            if (content) {
                const renderDiagram = async () => {
                    try {
                        setError(null);
                        const { svg } = await mermaid.render(id, content);
                        setSvg(svg);
                    } catch (err) {
                        console.error("Mermaid error:", err);
                        setError("Sintaks Mermaid tidak valid.");
                    }
                };
                renderDiagram();
            }
        }, [content, id]);

        const handleDownloadSVG = () => {
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            saveAs(blob, `diagram-${Date.now()}.svg`);
            toast.success("Diagram berhasil diunduh (SVG)!");
        };

        if (error) {
            return (
                <div className="my-8 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-mono">
                    ⚠️ {error}
                </div>
            );
        }

        return (
            <div className="my-10 flex flex-col items-center group w-full">
                <div
                    className="relative bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-blue-50/50 hover:shadow-[0_20px_60px_rgba(99,_102,_241,_0.12)] transition-all duration-500 w-full overflow-hidden flex justify-center items-center"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />

                <div className="flex gap-3 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100/50 backdrop-blur-sm">
                        <Sparkles size={12} className="text-indigo-500" /> Desain Premium Otomatis
                    </div>
                    <button
                        onClick={handleDownloadSVG}
                        className="flex items-center gap-2 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm transition-colors"
                    >
                        <Download size={12} /> Simpan SVG
                    </button>
                </div>
            </div>
        );
    };

    // ReactMarkdown code block component adaptation
    const MermaidRenderer = ({ children }) => {
        const code = String(children).replace(/\n$/, '');
        return <LocalMermaid content={code} />;
    };

    // Data Sources
    const [levels, setLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [savedRPPs, setSavedRPPs] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form States
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [selectedRPPId, setSelectedRPPId] = useState(''); // To track selected RPP

    // Generation States
    const [sourceType, setSourceType] = useState('rpp'); // 'rpp', 'atp', or 'manual'
    const [selectedAtpItem, setSelectedAtpItem] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');

    // History & Saving States
    const [savedHandouts, setSavedHandouts] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // Prepopulate from URL if coming from Schedule
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qGrade = params.get('grade');
        const qSubject = params.get('subject');
        const qTopic = params.get('topic');

        if (qGrade) setSelectedGrade(qGrade);
        if (qSubject) setSelectedSubject(qSubject);
        if (qTopic) {
            setTopic(qTopic);
            setSelectedRPPId('manual'); // Direct to manual if pre-filled
        }
    }, [levels, subjects]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to History
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'handouts'),
            where('userId', '==', user.uid)
            // REMOVED orderBy to prevent crash with malformed timestamps
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const handouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Manual sorting with safety check
            const sortedHandouts = handouts.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return bTime - aTime;
            });
            setSavedHandouts(sortedHandouts);
        }, (error) => {
            console.error("History subscription error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            setLoadingData(true);
            try {
                const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
                const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));

                const [classesSnap, subjectsSnap] = await Promise.all([
                    getDocs(classesQuery),
                    getDocs(subjectsQuery)
                ]);

                // Process Levels (Grades)
                const uniqueLevels = [...new Set(classesSnap.docs.map(doc => doc.data().level))].sort();
                setLevels(uniqueLevels);
                if (uniqueLevels.length > 0) setSelectedGrade(uniqueLevels[0]);

                // Process Subjects
                const fetchedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name));
                setSubjects(fetchedSubjects);
                if (fetchedSubjects.length > 0) setSelectedSubject(fetchedSubjects[0].id);

                // Fetch User Profile (for Teacher Name)
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                }

                // Fetch Saved RPPs for Topic Selection
                const rppQuery = query(
                    collection(db, 'lessonPlans'),
                    where('userId', '==', user.uid)
                    // REMOVED orderBy to prevent crash with malformed timestamps
                );
                const rppSnapshot = await getDocs(rppQuery);
                const rpps = rppSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Manual sorting with safety check (ascending for topic selection)
                const sortedRPPs = rpps.sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return aTime - bTime; // Ascending order
                });
                setSavedRPPs(sortedRPPs);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Gagal memuat data aplikasi");
            } finally {
                setLoadingData(false);
            }
        };

        fetchInitialData();
    }, [user]);

    // Handle RPP Selection
    const handleRPPSelect = (rppId) => {
        setSelectedRPPId(rppId);
        if (rppId === 'manual' || !rppId) {
            setTopic('');
            return;
        }

        const selectedRPP = savedRPPs.find(rpp => rpp.id === rppId);
        if (selectedRPP) {
            setTopic(selectedRPP.topic || selectedRPP.materi || '');
            // Auto match subject and grade if they exist in our lists
            if (selectedRPP.subjectId || selectedRPP.subject) {
                const rppSubId = selectedRPP.subjectId;
                const rppSubName = selectedRPP.subject;
                const subMatch = subjects.find(s => s.id === rppSubId || s.name === rppSubName);
                if (subMatch) setSelectedSubject(subMatch.id);
            }
            // Strict or loose match for grade
            if (selectedRPP.class || selectedRPP.grade) {
                const rppLevel = String(selectedRPP.class || selectedRPP.grade);
                if (levels.includes(rppLevel)) setSelectedGrade(rppLevel);
            }
            toast.success("Topik dimuat dari RPP");
        }
    };

    const handleGenerate = async () => {
        if (!topic && sourceType !== 'atp') {
            toast.error("Mohon isi atau pilih topik materi terlebih dahulu");
            return;
        }

        if (sourceType === 'atp' && !selectedAtpItem) {
            toast.error("Mohon pilih butir ATP terlebih dahulu");
            return;
        }

        setIsGenerating(true);
        try {
            const subjectObj = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectObj?.name || selectedSubject;

            // Find selected RPP for context
            const selectedRPP = savedRPPs.find(rpp => rpp.id === selectedRPPId);

            const result = await generateHandout({
                subject: subjectName,
                gradeLevel: selectedGrade,
                materi: sourceType === 'atp' ? selectedAtpItem.materi : topic,
                kd: sourceType === 'atp' ? (selectedAtpItem.tp || selectedAtpItem.kd) : selectedRPP?.kd,
                elemen: sourceType === 'atp' ? selectedAtpItem.elemen : selectedRPP?.elemen,
                rppContent: sourceType === 'rpp' ? selectedRPP?.content : null,
                teacherName: userProfile?.name || 'Guru Smart Teaching',
                teacherTitle: userProfile?.title || 'Bapak/Ibu',
                modelName: userProfile?.geminiModel // Pass user's preferred model if set
            });
            setGeneratedContent(result);
            toast.success("Bahan Ajar berhasil dibuat!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat bahan ajar: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadDocx = async () => {
        if (!generatedContent) return;

        toast.loading("Menyiapkan dokumen Word...", { id: 'word-export' });

        try {
            // Clone the preview element to modify it for export
            const previewEl = document.getElementById('handout-preview').cloneNode(true);
            const originalSvgs = document.getElementById('handout-preview').querySelectorAll('svg');
            const clonedSvgs = previewEl.querySelectorAll('svg');

            // Convert each SVG to PNG for Word compatibility
            for (let i = 0; i < clonedSvgs.length; i++) {
                const svgNode = clonedSvgs[i];
                const originalSvg = originalSvgs[i];

                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Ensure the SVG has the necessary namespaces for XMLSerializer
                    const svgClone = originalSvg.cloneNode(true);
                    if (!svgClone.getAttribute('xmlns')) {
                        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    }

                    // Remove potentially tainting external CSS/Fonts from the SVG clone
                    const styles = svgClone.querySelectorAll('style');
                    styles.forEach(style => {
                        let css = style.textContent;
                        // Strip @import and external font URLs
                        css = css.replace(/@import\s+url\([^)]+\);/g, '');
                        css = css.replace(/url\(['"]?http[^'"]+['"]?\)/g, 'none');
                        style.textContent = css;
                    });

                    const svgData = new XMLSerializer().serializeToString(svgClone);
                    // Use a data URL which is often more compatible for canvas drawing without tainting
                    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

                    const img = new Image();
                    img.crossOrigin = "anonymous";

                    await new Promise((resolve, reject) => {
                        img.onload = () => {
                            try {
                                // High resolution for Word
                                const scale = 2;
                                canvas.width = (originalSvg.clientWidth || 800) * scale;
                                canvas.height = (originalSvg.clientHeight || 600) * scale;

                                ctx.fillStyle = 'white';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                                const pngUrl = canvas.toDataURL('image/png');

                                const newImg = document.createElement('img');
                                newImg.src = pngUrl;
                                // Force width for Word compatibility
                                newImg.style.width = '100%';
                                newImg.style.maxWidth = '16cm'; // Standard A4 content width
                                newImg.style.height = 'auto';
                                newImg.style.display = 'block';
                                newImg.style.margin = '20px auto';

                                // Replace SVG with PNG Image
                                svgNode.parentNode.replaceChild(newImg, svgNode);
                                resolve();
                            } catch (e) {
                                console.error("Canvas toDataURL failed:", e);
                                // Fallback: don't replace if it fails, just keep the SVG or log it
                                resolve();
                            }
                        };
                        img.onerror = (e) => {
                            console.error("Image load error:", e);
                            resolve(); // Resolve anyway to continue with other SVGs
                        };
                        img.src = url;
                    });
                } catch (err) {
                    console.error("SVG conversion failed for item " + i, err);
                }
            }

            // Cleanup: remove interactive UI elements like buttons
            previewEl.querySelectorAll('button').forEach(btn => btn.remove());
            previewEl.querySelectorAll('.opacity-0, .transition-all').forEach(el => {
                if (el.classList.contains('opacity-0')) el.remove();
            });

            // Refine container styles for Word
            previewEl.querySelectorAll('.my-10').forEach(div => {
                div.style.margin = '20px 0';
                div.style.textAlign = 'center';
            });

            const contentHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #333; }
                        h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 20px; }
                        h2 { color: #1e3a8a; margin-top: 30px; border-left: 5px solid #3b82f6; padding-left: 15px; }
                        h3 { color: #1e40af; margin-top: 20px; }
                        p { margin-bottom: 15px; text-align: justify; }
                        blockquote { background: #f8fafc; border-left: 5px solid #6366f1; padding: 15px; margin: 20px 0; color: #475569; font-style: italic; }
                        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                        th { background-color: #f1f5f9; font-weight: bold; color: #1e293b; }
                        img { display: block; margin: 25px auto; max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    ${previewEl.innerHTML}
                </body>
                </html>
            `;

            const blob = await asBlob(contentHtml);
            saveAs(blob, `Bahan Ajar - ${topic}.docx`);
            toast.success("Dokumen Word berhasil diunduh", { id: 'word-export' });
        } catch (error) {
            console.error("Word export error:", error);
            toast.error("Gagal mengunduh dokumen: " + error.message, { id: 'word-export' });
        }
    };

    const handleSave = async () => {
        if (!generatedContent || !topic) return;

        // Check for duplicates
        const duplicate = savedHandouts.find(item =>
            item.topic?.toLowerCase().trim() === topic.toLowerCase().trim() &&
            item.subject === selectedSubject &&
            item.gradeLevel === selectedGrade
        );

        if (duplicate) {
            setConfirmModal({
                isOpen: true,
                title: 'Data Duplikat',
                message: `Sudah ada Bahan Ajar dengan topik "${topic}" untuk ${selectedSubject} Kelas ${selectedGrade}. Apakah Anda yakin ingin menyimpan duplikat?`,
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await executeSave();
                }
            });
            return;
        }

        await executeSave();
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            const subjectObj = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectObj?.name || selectedSubject;

            await addDoc(collection(db, 'handouts'), {
                userId: user.uid,
                topic: topic,
                subjectId: selectedSubject,
                subject: subjectName,
                gradeLevel: selectedGrade,
                content: generatedContent,
                createdAt: serverTimestamp(),
                teacherName: userProfile?.name || 'Guru',
                teacherTitle: userProfile?.title || 'Bapak/Ibu',
                school: userProfile?.school || ''
            });
            toast.success("Bahan Ajar berhasil disimpan ke Riwayat!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Gagal menyimpan.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Riwayat',
            message: 'Apakah Anda yakin ingin menghapus item riwayat bahan ajar ini?',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'handouts', id));
                    toast.success("Item dihapus.");
                } catch (error) {
                    toast.error("Gagal menghapus.");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleLoad = (item) => {
        setGeneratedContent(item.content);
        setTopic(item.topic);
        setSelectedSubject(item.subjectId || item.subject || '');
        setSelectedGrade(item.gradeLevel || '');
        setShowHistory(false);
        toast.success("Bahan Ajar dimuat kembali.");
    };

    return (
        <div className="flex h-screen bg-bg-light dark:bg-bg-dark font-poppins">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-bg-light dark:bg-bg-dark p-6">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                                    <BookOpen className="w-8 h-8 text-primary-light" />
                                    Generator Bahan Ajar (Handout)
                                </h1>
                                <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                                    Buat modul belajar visual dan menarik untuk siswa dalam sekejap.
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800 w-fit">
                                    <Sparkles size={12} /> Powered by BSKAP 2025 Intel Engine
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistory(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                            >
                                <History size={18} />
                                Riwayat
                            </button>
                        </div>

                        {/* Input Section */}
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-6 border border-border-light dark:border-border-dark">
                            <div className="space-y-6">
                                {/* Top Row: Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 1. Kelas */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Pilih Kelas
                                        </label>
                                        <select
                                            value={selectedGrade}
                                            onChange={(e) => {
                                                setSelectedGrade(e.target.value);
                                                setSelectedRPPId('');
                                                setTopic('');
                                            }}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                        >
                                            {levels.length > 0 ? (
                                                levels.map((level, idx) => (
                                                    <option key={idx} value={level}>{level}</option>
                                                ))
                                            ) : (
                                                <option disabled>Tidak ada data kelas</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* 2. Mata Pelajaran */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Mata Pelajaran
                                        </label>
                                        <select
                                            value={selectedSubject}
                                            onChange={(e) => {
                                                setSelectedSubject(e.target.value);
                                                setSelectedRPPId('');
                                                setTopic('');
                                            }}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                        >
                                            {subjects.length > 0 ? (
                                                subjects.map((sub, idx) => (
                                                    <option key={idx} value={sub.id}>{sub.name}</option>
                                                ))
                                            ) : (
                                                <option disabled>Tidak ada data mapel</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* Source Type Toggle */}
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => { setSourceType('rpp'); setTopic(''); setSelectedRPPId(''); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sourceType === 'rpp' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Pilih dari RPP
                                    </button>
                                    <button
                                        onClick={() => { setSourceType('atp'); setTopic(''); setSelectedAtpItem(null); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sourceType === 'atp' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Pilih dari Database BSKAP
                                    </button>
                                    <button
                                        onClick={() => { setSourceType('manual'); setTopic(''); setSelectedRPPId(''); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sourceType === 'manual' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Manual Input
                                    </button>
                                </div>

                                {/* Dynamic Selection based on Source Type */}
                                {sourceType === 'rpp' && (
                                    <div className="animate-fade-in-down">
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Pilih Topik dari RPP (Sesuai Kelas & Mapel)
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedRPPId}
                                                onChange={(e) => handleRPPSelect(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light appearance-none"
                                            >
                                                <option value="">-- Pilih Topik dari RPP Tersimpan --</option>
                                                {savedRPPs
                                                    .filter(rpp => {
                                                        const rppGrade = String(rpp.gradeLevel || rpp.class || rpp.grade || '').trim();
                                                        const selectedGradeStr = String(selectedGrade).trim();
                                                        const gradeMatch = rppGrade === selectedGradeStr || rppGrade.includes(selectedGradeStr) || selectedGradeStr.includes(rppGrade);

                                                        const rppSubjectId = rpp.subjectId;
                                                        const rppSubjectName = (rpp.subject || '').toLowerCase().trim();
                                                        const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
                                                        const subjectMatch = rppSubjectId === selectedSubject || rppSubjectName === selectedSubjectObj?.name?.toLowerCase().trim();

                                                        return gradeMatch && subjectMatch;
                                                    })
                                                    .map((rpp) => (
                                                        <option key={rpp.id} value={rpp.id}>
                                                            {rpp.topic || rpp.materi}
                                                        </option>
                                                    ))}
                                            </select>
                                            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            *Handout akan disesuaikan dengan isi RPP yang Anda pilih.
                                        </p>
                                    </div>
                                )}

                                {sourceType === 'atp' && (
                                    <div className="animate-fade-in-down">
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Pilih Butir ATP / Materi Resmi BSKAP
                                        </label>
                                        <div className="relative">
                                            <select
                                                onChange={(e) => {
                                                    const val = JSON.parse(e.target.value);
                                                    setSelectedAtpItem(val);
                                                    setTopic(val.materi);
                                                }}
                                                className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light appearance-none"
                                            >
                                                <option value="">-- Pilih Materi dari Database --</option>
                                                {(() => {
                                                    const subjectObj = subjects.find(s => s.id === selectedSubject);
                                                    const subjectName = subjectObj?.name || '';
                                                    const gradeNum = parseInt(selectedGrade);
                                                    const level = gradeNum <= 6 ? 'SD' : (gradeNum <= 9 ? 'SMP' : 'SMA');
                                                    const gradeStr = String(gradeNum);

                                                    const subjectData = BSKAP_DATA.subjects?.[level]?.[gradeStr]?.[subjectName];
                                                    if (!subjectData) return <option disabled>Tidak ada data kurikulum</option>;

                                                    const ganjilMateri = subjectData.ganjil?.materi_inti?.map(m => ({
                                                        materi: m,
                                                        elemen: subjectData.ganjil.elemen?.join(', ') || 'Umum',
                                                        tp: subjectData.ganjil.cp_snippet
                                                    })) || [];

                                                    const genapMateri = subjectData.genap?.materi_inti?.map(m => ({
                                                        materi: m,
                                                        elemen: subjectData.genap.elemen?.join(', ') || 'Umum',
                                                        tp: subjectData.genap.cp_snippet
                                                    })) || [];

                                                    const allMateri = [...ganjilMateri, ...genapMateri];

                                                    if (allMateri.length === 0) return <option disabled>Materi belum tersedia</option>;

                                                    return allMateri.map((item, idx) => (
                                                        <option key={idx} value={JSON.stringify(item)}>
                                                            [{item.elemen}] {item.materi}
                                                        </option>
                                                    ));
                                                })()}
                                            </select>
                                            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {sourceType === 'manual' && (
                                    <div className="animate-fade-in-down">
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Topik / Materi Manual
                                        </label>
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                            placeholder="Ketik topik materi secara detail..."
                                        />
                                    </div>
                                )}

                                {/* Bottom Row: Trigger Button */}
                                <div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !topic}
                                        className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 font-bold text-lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Sedang Menulis Modul...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                Buat Modul Bahan Ajar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Result Section */}
                        {generatedContent && (
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-6 border border-border-light dark:border-border-dark animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6 border-b border-border-light dark:border-border-dark pb-4">
                                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                                        Preview Bahan Ajar
                                    </h2>
                                    <div className="flex gap-3">
                                        {/* Save Button */}
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            <Save size={16} />
                                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                        <button
                                            onClick={handleDownloadDocx}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Word
                                        </button>
                                    </div>
                                </div>

                                <div className={`prose dark:prose-invert max-w-none bg-white p-8 rounded-lg shadow-sm border border-gray-100 min-h-[500px] ${getRegionFromSubject(selectedSubject) === 'Jawa' ? 'font-carakan' : ''}`} id="handout-preview">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                                        components={{
                                            code({ node, inline, className, children, ...props }) {
                                                const match = /language-mermaid/.exec(className || '');
                                                return !inline && match ? (
                                                    <MermaidRenderer>{children}</MermaidRenderer>
                                                ) : (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {generatedContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* History Modal */}
                    {showHistory && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <History size={20} className="text-blue-500" />
                                        Riwayat Bahan Ajar
                                    </h3>
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {savedHandouts.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500">
                                            Belum ada riwayat tersimpan.
                                        </div>
                                    ) : (
                                        savedHandouts.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 dark:text-white line-clamp-1">{item.topic}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{item.subject}</span>
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">Kelas {item.gradeLevel}</span>
                                                            <span className="flex items-center gap-1 text-xs">
                                                                <Clock size={12} />
                                                                {item.createdAt?.seconds
                                                                    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                                                                    : 'Baru saja'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleLoad(item)}
                                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                                            title="Buka kembali"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl text-center text-xs text-gray-500">
                                    Simpan konten terbaik Anda untuk digunakan kembali nanti.
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {confirmModal.isOpen && (
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center">
                        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${confirmModal.title === 'Data Duplikat' ? 'bg-orange-100' : 'bg-red-100'}`}>
                            {confirmModal.title === 'Data Duplikat' ? (
                                <Wand2 className="h-8 w-8 text-orange-600" />
                            ) : (
                                <Trash2 className="h-8 w-8 text-red-600" />
                            )}
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
                                className={`px-6 py-2.5 text-white font-semibold rounded-xl transition shadow-lg ${confirmModal.title === 'Data Duplikat' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'} dark:shadow-none`}
                            >
                                {confirmModal.title === 'Data Duplikat' ? 'Simpan Duplikat' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HandoutGeneratorPage;
