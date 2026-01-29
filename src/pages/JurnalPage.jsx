import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Calendar, List, Clock, Save, ChevronDown, Check, Trash, Upload, Download, FileSpreadsheet, Plus, Zap, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { analyzeTeachingJournals } from '../utils/gemini'; // Add this line
import toast from 'react-hot-toast';
import StyledInput from '../components/StyledInput';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import StyledTable from '../components/StyledTable';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../utils/SettingsContext';
import { getTopicForSchedule } from '../utils/topicUtils';
import { toHanacaraka, getRegionFromSubject } from '../utils/carakan';

export default function JurnalPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [learningActivities, setLearningActivities] = useState('');
  const [reflection, setReflection] = useState('');
  const [isImplemented, setIsImplemented] = useState(true); // New state for status
  const [challenges, setChallenges] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingJournalId, setEditingJournalId] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSentimentPercentage, setAiSentimentPercentage] = useState(0);
  const [aiSentimentExplanation, setAiSentimentExplanation] = useState('');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false); // New state for AI analysis loading
  const [programs, setPrograms] = useState([]);
  const [carryOverSuggestion, setCarryOverSuggestion] = useState(null); // New state for carry-over
  const [similarJournalSuggestion, setSimilarJournalSuggestion] = useState(null); // New state for cloning
  const { activeSemester, academicYear, geminiModel } = useSettings();

  const isJavanese = React.useMemo(() => {
    const sub = subjects.find(s => s.id === selectedSubject);
    return getRegionFromSubject(sub?.name) === 'Jawa';
  }, [selectedSubject, subjects]);

  const handleTransliterate = (text, setter) => {
    if (!text) return;
    const result = toHanacaraka(text);
    setter(result);
    toast.success('Berhasil dikonversi ke Aksara Jawa!');
  };

  const classesCollectionRef = React.useMemo(() => collection(db, 'classes'), []);
  const subjectsCollectionRef = React.useMemo(() => collection(db, 'subjects'), []);
  const journalsCollectionRef = React.useMemo(() => collection(db, 'teachingJournals'), []);
  const teachingProgramsCollectionRef = React.useMemo(() => collection(db, 'teachingPrograms'), []);

  const [searchParams] = useSearchParams();
  const classIdFromUrl = searchParams.get('classId');
  const subjectIdFromUrl = searchParams.get('subjectId');

  // Set current date on component mount
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setCurrentDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch classes and subjects
  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }
      try {
        const classesQuery = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid));
        const classesData = await getDocs(classesQuery);
        const fetchedClasses = classesData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(fetchedClasses);

        const subjectsQuery = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
        const subjectsData = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubjects(fetchedSubjects);

        // Pre-select class and subject if provided in URL
        if (classIdFromUrl) {
          const preselectedClass = fetchedClasses.find(cls => cls.rombel === classIdFromUrl || cls.id === classIdFromUrl);
          if (preselectedClass) {
            setSelectedClass(preselectedClass.id);
          }
        }
        if (subjectIdFromUrl) {
          const preselectedSubject = fetchedSubjects.find(sub => sub.name === subjectIdFromUrl || sub.id === subjectIdFromUrl);
          if (preselectedSubject) {
            setSelectedSubject(preselectedSubject.id);
          }
        }

        const programsQuery = query(teachingProgramsCollectionRef, where('userId', '==', auth.currentUser.uid));
        const programsData = await getDocs(programsQuery);
        setPrograms(programsData.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast.error('Gagal memuat data kelas atau mata pelajaran.');
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchData();
      } else {
        setClasses([]);
        setSubjects([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [classIdFromUrl, subjectIdFromUrl]); // Re-run if URL params change

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async (silent = false) => {
    if (!auth.currentUser) return;
    if (!silent) setIsLoading(true);
    try {
      const q = query(
        journalsCollectionRef,
        where('userId', '==', auth.currentUser.uid),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedJournals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJournals(fetchedJournals);

      // --- Start AI Analysis ---
      setIsAnalyzingAI(true);
      const aiResults = await analyzeTeachingJournals(fetchedJournals, geminiModel);
      setAiSummary(aiResults.summary);
      setAiSentimentPercentage(aiResults.sentiment.percentage);
      setAiSentimentExplanation(aiResults.sentiment.explanation);
      setIsAnalyzingAI(false);
      // --- End AI Analysis ---

    } catch (error) {
      console.error("Error fetching journal entries: ", error);
      toast.error('Gagal memuat jurnal mengajar.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [auth.currentUser, activeSemester, academicYear, geminiModel, journalsCollectionRef]);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries, activeSemester, academicYear]);

  // Logic for Carry-over suggestion
  useEffect(() => {
    if (selectedClass && selectedSubject && currentDate && journals.length > 0) {
      // Find the latest "Tidak Terlaksana" entry before current date for this class/subject
      const carryOver = journals
        .filter(j => {
          const classMatch = j.classId === selectedClass || j.className === selectedClass || (classes.find(c => c.id === selectedClass)?.rombel === j.className);
          const subjectMatch = j.subjectId === selectedSubject || j.subjectName === selectedSubject || (subjects.find(s => s.id === selectedSubject)?.name === j.subjectName);
          return classMatch && subjectMatch &&
            j.isImplemented === false &&
            moment(j.date).isBefore(currentDate);
        })
        .sort((a, b) => moment(b.date).diff(moment(a.date)))[0];

      setCarryOverSuggestion(carryOver || null);
    } else {
      setCarryOverSuggestion(null);
    }
  }, [selectedClass, selectedSubject, currentDate, journals]);

  // Logic for Similar Material Cloning Suggestion
  useEffect(() => {
    if (material && material.length > 3 && journals.length > 0) {
      const normMaterial = material.trim().toLowerCase();
      // Find the most recent journal with the same material (that is not the one currently being edited)
      const similar = journals
        .filter(j => j.id !== editingJournalId && (j.material || '').trim().toLowerCase() === normMaterial)
        .sort((a, b) => moment(b.date).diff(moment(a.date)))[0];

      setSimilarJournalSuggestion(similar || null);
    } else {
      setSimilarJournalSuggestion(null);
    }
  }, [material, journals, editingJournalId]);

  const handleSaveJournal = async () => {
    if (!selectedClass || !selectedSubject || !material || !learningObjectives || !learningActivities) {
      toast.error('Harap lengkapi semua informasi wajib (Kelas, Mata Pelajaran, Materi, Tujuan, Kegiatan).');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Anda harus login untuk menyimpan jurnal.');
      return;
    }

    const classData = classes.find(cls => cls.id === selectedClass);
    const subjectData = subjects.find(sub => sub.id === selectedSubject);

    if (!classData || !subjectData) {
      toast.error('Kelas atau Mata Pelajaran tidak ditemukan.');
      return;
    }

    const journalData = {
      userId: auth.currentUser.uid,
      date: currentDate,
      classId: classData.id,
      className: classData.rombel,
      subjectId: subjectData.id,
      subjectName: subjectData.name,
      material: material,
      learningObjectives: learningObjectives,
      learningActivities: learningActivities,
      reflection: reflection,
      isImplemented: isImplemented,
      challenges: isImplemented ? '' : challenges,
      followUp: followUp,
      timestamp: serverTimestamp(),
      semester: activeSemester,
      academicYear: academicYear,
    };

    const batch = writeBatch(db);
    let journalRef;

    if (editingJournalId) {
      // Update existing journal entry
      journalRef = doc(journalsCollectionRef, editingJournalId);
      batch.set(journalRef, journalData, { merge: true });
    } else {
      // Create a unique ID for new journal entry (for upsert behavior)
      const uniqueJournalId = `${currentDate}-${classData.id}-${subjectData.id}`;
      journalRef = doc(journalsCollectionRef, uniqueJournalId);
      batch.set(journalRef, journalData, { merge: true });
    }

    const promise = batch.commit();

    toast.promise(promise, {
      loading: editingJournalId ? 'Menyimpan perubahan jurnal...' : 'Menyimpan jurnal...',
      success: () => {
        // Reset form after successful save
        setSelectedClass('');
        setSelectedSubject('');
        setMaterial('');
        setLearningObjectives('');
        setLearningActivities('');
        setReflection('');
        setIsImplemented(true);
        setChallenges('');
        setFollowUp('');
        setEditingJournalId(null);
        fetchJournalEntries(true); // Silent refresh
        return editingJournalId ? 'Perubahan jurnal berhasil disimpan!' : 'Jurnal berhasil disimpan!';
      },
      error: (err) => {
        console.error("Error saving journal: ", err);
        return editingJournalId ? 'Gagal menyimpan perubahan jurnal. Silakan coba lagi.' : 'Gagal menyimpan jurnal. Silakan coba lagi.';
      },
    });
  };

  const handleEditJournal = (journal) => {
    setEditingJournalId(journal.id);
    setCurrentDate(journal.date);

    // Resolve IDs from names if IDs are missing (legacy support)
    const resolvedClassId = journal.classId || classes.find(c => c.rombel === journal.className)?.id || journal.className;
    const resolvedSubjectId = journal.subjectId || subjects.find(s => s.name === journal.subjectName)?.id || journal.subjectName;

    setSelectedClass(resolvedClassId);
    setSelectedSubject(resolvedSubjectId);

    setMaterial(journal.material);
    setLearningObjectives(journal.learningObjectives);
    setLearningActivities(journal.learningActivities);
    setReflection(journal.reflection);
    setChallenges(journal.challenges || '');
    setFollowUp(journal.followUp || '');
    // Scroll to top or form to make editing easier
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJournal = async (journalId) => {
    if (!auth.currentUser) {
      toast.error('Anda harus login untuk menghapus jurnal.');
      return;
    }

    const journalRef = doc(journalsCollectionRef, journalId);
    const promise = deleteDoc(journalRef);

    toast.promise(promise, {
      loading: 'Menghapus jurnal...',
      success: () => {
        fetchJournalEntries(true); // Silent refresh
        return 'Jurnal berhasil dihapus!';
      },
      error: (err) => {
        console.error("Error deleting journal: ", err);
        return 'Gagal menghapus jurnal. Silakan coba lagi.';
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Jurnal Mengajar</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Form Section - Fixed Width */}
        <div className="lg:w-1/3">
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6 space-y-4">
            <StyledInput
              type="date"
              label="Tanggal"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
            />

            <StyledSelect
              label="Kelas"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Pilih Kelas</option>
              {classes.slice().sort((a, b) => a.rombel.localeCompare(b.rombel)).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.rombel}</option>
              ))}
            </StyledSelect>

            <StyledSelect
              label="Mata Pelajaran"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </StyledSelect>

            <div className="relative">
              <StyledInput
                type="text"
                label="Materi"
                placeholder="Materi yang diajarkan"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className={isJavanese ? 'font-carakan' : ''}
              />
              {isJavanese && material && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleTransliterate(material, setMaterial); }}
                  className="mt-1 text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                >
                  <Sparkles size={10} /> Konversi ke Aksara Jawa
                </button>
              )}
              {/* Carry-over Suggestion */}
              {carryOverSuggestion && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 shadow-sm transition-all animate-bounce-short">
                  <RefreshCw size={14} className="text-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase tracking-tighter leading-none mb-0.5">Materi Tertunda ({moment(carryOverSuggestion.date).format('DD/MM')}):</p>
                    <p className="text-[11px] font-bold text-red-700 dark:text-red-300 truncate italic">
                      {carryOverSuggestion.material}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMaterial(carryOverSuggestion.material);
                      setLearningObjectives(carryOverSuggestion.learningObjectives || '');
                      setLearningActivities(carryOverSuggestion.learningActivities || '');
                    }}
                    className="shrink-0 text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm active:scale-95 transition-all"
                  >
                    Lanjutkan
                  </button>
                </div>
              )}

              {/* Planned Topic Suggestion */}
              {(() => {
                const classInfo = classes.find(c => c.id === selectedClass);
                const subjectInfo = subjects.find(s => s.id === selectedSubject);
                const schedule = {
                  subject: subjectInfo?.name || '',
                  class: classInfo?.rombel || '',
                  subjectId: selectedSubject,
                  classId: selectedClass
                };

                const plannedTopic = getTopicForSchedule(
                  schedule,
                  currentDate,
                  programs,
                  classes,
                  activeSemester,
                  academicYear
                );

                if (plannedTopic) {
                  return (
                    <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 shadow-sm transition-all animate-in slide-in-from-top-1 duration-300">
                      <Zap size={14} className="text-green-600 shrink-0" fill="currentColor" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-green-800 dark:text-green-400 uppercase tracking-tighter leading-none mb-0.5">Rencana Materi Promes:</p>
                        <p className="text-[11px] font-bold text-green-700 dark:text-green-300 truncate italic">
                          {plannedTopic}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setMaterial(plannedTopic.split(',')[0]); // Use first topic if multiple
                        }}
                        className="shrink-0 text-[10px] bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm active:scale-95 transition-all"
                      >
                        Gunakan
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Similar Journal Suggestion (Cloning) */}
              {similarJournalSuggestion && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm transition-all animate-in slide-in-from-top-1 duration-300">
                  <BookOpen size={14} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-tighter leading-none mb-0.5">Materi Serupa Ditemukan:</p>
                    <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate italic">
                      Copy dari {similarJournalSuggestion.className} ({moment(similarJournalSuggestion.date).format('DD/MM')})
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setLearningObjectives(similarJournalSuggestion.learningObjectives || '');
                      setLearningActivities(similarJournalSuggestion.learningActivities || '');
                      setReflection(similarJournalSuggestion.reflection || '');
                      setFollowUp(similarJournalSuggestion.followUp || '');
                      toast.success('Konten jurnal disalin!');
                    }}
                    className="shrink-0 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm active:scale-95 transition-all"
                  >
                    Salin
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <StyledInput
                type="textarea"
                label="Tujuan Pembelajaran"
                placeholder="Tujuan pembelajaran hari ini"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                className={isJavanese ? 'font-carakan' : ''}
                voiceEnabled
              />
              {isJavanese && learningObjectives && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleTransliterate(learningObjectives, setLearningObjectives); }}
                  className="absolute right-0 top-0 mt-0 mr-1 text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors z-10"
                >
                  Konversi Aksara
                </button>
              )}
            </div>

            <div className="relative">
              <StyledInput
                type="textarea"
                label="Kegiatan Pembelajaran"
                placeholder="Deskripsi kegiatan di kelas"
                value={learningActivities}
                onChange={(e) => setLearningActivities(e.target.value)}
                className={isJavanese ? 'font-carakan' : ''}
                voiceEnabled
              />
              {isJavanese && learningActivities && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleTransliterate(learningActivities, setLearningActivities); }}
                  className="absolute right-0 top-0 mt-0 mr-1 text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors z-10"
                >
                  Konversi Aksara
                </button>
              )}
            </div>

            <StyledInput
              type="textarea"
              label="Refleksi"
              placeholder="Refleksi diri setelah mengajar"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              voiceEnabled
            />

            <StyledSelect
              label="Keterlaksanaan Pembelajaran"
              value={isImplemented ? 'true' : 'false'}
              onChange={(e) => {
                const val = e.target.value === 'true';
                setIsImplemented(val);
                if (val) setChallenges('');
              }}
            >
              <option value="true">Terlaksana</option>
              <option value="false">Tidak Terlaksana</option>
            </StyledSelect>

            {!isImplemented && (
              <StyledInput
                type="textarea"
                label="Alasan Tidak Terlaksana"
                placeholder="Jelaskan alasan materi tidak terlaksana (misal: hari libur, rapat guru, dll)"
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                voiceEnabled
                className="animate-in slide-in-from-top-2 duration-300"
              />
            )}

            <StyledInput
              type="textarea"
              label="Tindak Lanjut"
              placeholder="Rencana tindak lanjut"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              voiceEnabled
            />

            <div className="mt-6 flex justify-end">
              <StyledButton onClick={handleSaveJournal}>
                {editingJournalId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
              </StyledButton>
              {editingJournalId && (
                <StyledButton
                  onClick={() => {
                    setEditingJournalId(null);
                    setIsImplemented(true);
                    setChallenges('');
                  }}
                  className="ml-2 bg-gray-500 hover:bg-gray-600"
                >
                  Batal Edit
                </StyledButton>
              )}
            </div>
          </div>
        </div>

        {/* Table Section - Horizontally Scrollable */}
        <div className="lg:w-2/3 overflow-x-auto">
          {/* AI Analysis Section Start */}
          <div className="mb-6 rounded-2xl bg-blue-50 p-6 shadow-md dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Analisis AI Jurnal</h3>
            {isAnalyzingAI ? (
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-primary"></div>
                <p className="ml-3 text-gray-600 dark:text-gray-400">Menganalisis jurnal...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Ringkasan Jurnal</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {aiSummary || "Tidak ada ringkasan tersedia."}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Analisis Sentimen Keseluruhan</h4>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${aiSentimentPercentage}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{aiSentimentPercentage}% Positif</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {aiSentimentExplanation || "Tidak ada analisis sentimen tersedia."}
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* AI Analysis Section End */}

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Daftar Jurnal Mengajar</h3>
          {journals.length > 0 ? (
            <div className="overflow-y-auto h-96">
              <StyledTable headers={['Tanggal', 'Kelas', 'Mata Pelajaran', 'Materi', 'Keterlaksanaan Pembelajaran', 'Aksi']}>
                {journals.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(journal => (
                  <tr key={journal.id}>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm font-medium text-text-light dark:text-text-dark">
                      {journal.date}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">
                      {journal.className}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">
                      {journal.subjectName}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">
                      {journal.material}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                      {journal.isImplemented !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Terlaksana
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Tidak Terlaksana
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                      <StyledButton onClick={() => handleEditJournal(journal)} className="mr-2">Edit</StyledButton>
                      <StyledButton onClick={() => handleDeleteJournal(journal.id)} className="bg-red-500 hover:bg-red-600">
                        Hapus
                      </StyledButton>
                    </td>
                  </tr>
                ))}
              </StyledTable>
            </div>
          ) : (
            <p className="text-text-muted-light dark:text-text-muted-dark">Belum ada jurnal mengajar yang tersimpan.</p>
          )}
        </div>
      </div>
    </div>
  );
}