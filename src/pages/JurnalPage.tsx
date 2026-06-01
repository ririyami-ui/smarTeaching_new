import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, CalendarOff, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import 'moment/locale/id';
import { analyzeTeachingJournals } from '../utils/gemini';
import { generateDataHash } from '../utils/cacheUtils';
import toast from 'react-hot-toast';
import StyledInput from '../components/StyledInput';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import StyledTable from '../components/StyledTable';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../utils/SettingsContext';
import { getTopicForSchedule } from '../utils/topicUtils';
import { getRegionFromSubject } from '../utils/carakan';
import { indonesianHolidays } from '../utils/holidayData';
import { useAuth } from '../hooks/useAuth';
import { isDateEffective } from '../utils/effectiveWeeksUtils';

moment.locale('id');

interface ClassData {
  id: string;
  rombel: string;
  [key: string]: unknown;
}

interface SubjectData {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  material: string;
  learningObjectives: string;
  learningActivities: string;
  reflection: string;
  isImplemented: boolean;
  challenges: string;
  followUp: string;
  semester: string;
  academicYear: string;
  timestamp?: unknown;
}

interface Holiday {
  id: string;
  name: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export default function JurnalPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [learningActivities, setLearningActivities] = useState('');
  const [reflection, setReflection] = useState('');
  const [isImplemented, setIsImplemented] = useState(true);
  const [challenges, setChallenges] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSentimentPercentage, setAiSentimentPercentage] = useState(0);
  const [aiSentimentExplanation, setAiSentimentExplanation] = useState('');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [programs, setPrograms] = useState<Record<string, unknown>[]>([]);
  const [carryOverSuggestion, setCarryOverSuggestion] = useState<JournalEntry | null>(null);
  const [similarJournalSuggestion, setSimilarJournalSuggestion] = useState<JournalEntry | null>(null);
  const [firestoreHolidays, setFirestoreHolidays] = useState<Holiday[]>([]);
  const [isDateEffectiveStatus, setIsDateEffectiveStatus] = useState(true);
  const [pekanEfektifData, setPekanEfektifData] = useState<Record<string, unknown>>({});
  const { activeSemester, academicYear, geminiModel } = useSettings();

  const isJavanese = useMemo(() => {
    const sub = subjects.find(s => s.id === selectedSubject);
    return getRegionFromSubject(sub?.name || '') === 'Jawa';
  }, [selectedSubject, subjects]);

  const journalsCollectionRef = useMemo(() => collection(db, 'teachingJournals'), []);
  const [searchParams] = useSearchParams();
  const dateFromUrl = searchParams.get('date');
  const classIdFromUrl = searchParams.get('classId');
  const subjectIdFromUrl = searchParams.get('subjectId');

  useEffect(() => {
    if (dateFromUrl && moment(dateFromUrl, 'YYYY-MM-DD', true).isValid()) {
      setCurrentDate(dateFromUrl);
    } else if (!dateFromUrl) {
      setCurrentDate(moment().format('YYYY-MM-DD'));
    }
  }, [dateFromUrl]);

  useEffect(() => {
    if (classIdFromUrl) {
      const preselectedClass = classes.find(cls => cls.rombel === classIdFromUrl || cls.id === classIdFromUrl);
      if (preselectedClass) setSelectedClass(preselectedClass.id);
    }
    if (subjectIdFromUrl) {
      const preselectedSubject = subjects.find(sub => sub.name === subjectIdFromUrl || sub.id === subjectIdFromUrl);
      if (preselectedSubject) setSelectedSubject(preselectedSubject.id);
    }
  }, [classIdFromUrl, subjectIdFromUrl, classes, subjects]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'holidays'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setFirestoreHolidays(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Holiday)));
      } catch (err) {
        console.warn('Could not fetch Firestore holidays for JurnalPage:', err);
      }
    };
    const unsubscribe = auth.onAuthStateChanged(user => { if (user) fetchHolidays(); });
    return () => unsubscribe();
  }, [user]);

  const currentDateHoliday = useMemo(() => {
    if (!currentDate) return null;
    const selectedMoment = moment(currentDate).startOf('day');

    const staticMatch = indonesianHolidays.find(h => h.date === currentDate);
    if (staticMatch) return staticMatch;

    const firestoreMatch = firestoreHolidays.find(h => {
      if (h.startDate && h.endDate) {
        const start = moment(h.startDate).startOf('day');
        const end = moment(h.endDate).endOf('day');
        return selectedMoment.isBetween(start, end, null, '[]');
      }
      return moment(h.date).isSame(selectedMoment, 'day');
    });

    return firestoreMatch || null;
  }, [currentDate, firestoreHolidays]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const userId = user.uid;
        const classesQuery = query(collection(db, 'classes'), where('userId', '==', userId));
        const classesData = await getDocs(classesQuery);
        const fetchedClasses = classesData.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ClassData));
        setClasses(fetchedClasses);

        const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', userId));
        const subjectsData = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsData.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as SubjectData));
        setSubjects(fetchedSubjects);

        const programsQuery = query(collection(db, 'teachingPrograms'), where('userId', '==', userId));
        const programsData = await getDocs(programsQuery);
        setPrograms(programsData.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));

      } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast.error('Gagal memuat data kelas atau mata pelajaran.');
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) fetchData();
      else {
        setClasses([]);
        setSubjects([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [classIdFromUrl, subjectIdFromUrl, user]);

  // Fetch pekan efektif data and check if current date is effective
  useEffect(() => {
    const fetchPekanEfektif = async () => {
      if (!user || !selectedClass) {
        setPekanEfektifData({});
        setIsDateEffectiveStatus(true);
        return;
      }

      try {
        const selectedClassObj = classes.find(c => c.id === selectedClass);
        if (!selectedClassObj) return;

        const calendarId = `calendar_${user.uid}_${selectedClassObj.rombel}_${academicYear.replace('/', '-')}_${activeSemester}`;
        const calDoc = await getDoc(doc(db, 'teachingPrograms', calendarId));
        
        if (calDoc.exists()) {
          const data = calDoc.data();
          setPekanEfektifData(data);
          
          // Check if current date is effective
          if (currentDate && data.pekanEfektif) {
            const effectiveCheck = isDateEffective(
              currentDate,
              data.pekanEfektif as Array<{name: string; totalWeeks: number | string; nonEffectiveWeeks: number | string; keterangan: string}>,
              academicYear,
              activeSemester
            );
            setIsDateEffectiveStatus(effectiveCheck.isEffective);
          }
        } else {
          setPekanEfektifData({});
          setIsDateEffectiveStatus(true);
        }
      } catch (error) {
        console.error('Error fetching pekan efektif:', error);
        setPekanEfektifData({});
        setIsDateEffectiveStatus(true);
      }
    };

    fetchPekanEfektif();
  }, [user, selectedClass, classes, currentDate, academicYear, activeSemester]);


  const fetchJournalEntries = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const q = query(
        journalsCollectionRef,
        where('userId', '==', user.uid),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedJournals = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as JournalEntry));
      setJournals(fetchedJournals);

      setIsAnalyzingAI(true);
      const dataToHash = fetchedJournals.map(j => ({
        d: j.date, m: j.material, o: j.learningObjectives, r: j.reflection, c: j.challenges
      }));
      const currentHash = generateDataHash(dataToHash);
      const cacheKey = `journal_analysis_${user.uid}_${activeSemester}_${academicYear}`;
      const cachedData = localStorage.getItem(cacheKey);

      let shouldUseCache = false;
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        if (parsedCache.hash === currentHash) {
          const isErrorResult = parsedCache.summary?.includes('kendala') || parsedCache.summary?.includes('API') || (parsedCache.sentiment?.percentage === 0 && !parsedCache.sentiment?.explanation);
          if (!isErrorResult) {
            setAiSummary(parsedCache.summary);
            setAiSentimentPercentage(parsedCache.sentiment.percentage);
            setAiSentimentExplanation(parsedCache.sentiment.explanation);
            shouldUseCache = true;
          }
        }
      }

      if (!shouldUseCache && fetchedJournals.length > 0) {
        try {
          const aiResults = await analyzeTeachingJournals(fetchedJournals, geminiModel);
          setAiSummary(aiResults.summary);
          setAiSentimentPercentage(aiResults.sentiment.percentage);
          setAiSentimentExplanation(aiResults.sentiment.explanation);

          const isErrorResult = aiResults.summary?.includes('kendala') || aiResults.summary?.includes('API') || (aiResults.sentiment?.percentage === 0 && !aiResults.sentiment?.explanation);
          if (!isErrorResult) {
            localStorage.setItem(cacheKey, JSON.stringify({
              hash: currentHash,
              summary: aiResults.summary,
              sentiment: aiResults.sentiment,
              timestamp: Date.now()
            }));
          }
        } catch (err) {
          console.error("AI Analysis failed:", err);
        }
      } else if (fetchedJournals.length === 0) {
        setAiSummary('');
        setAiSentimentPercentage(0);
        setAiSentimentExplanation('');
      }
      setIsAnalyzingAI(false);
    } catch (error) {
      console.error("Error fetching journal entries: ", error);
      toast.error('Gagal memuat jurnal mengajar.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeSemester, academicYear, geminiModel, journalsCollectionRef, user]);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  useEffect(() => {
    if (selectedClass && selectedSubject && currentDate && journals.length > 0) {
      const carryOver = journals
        .filter(j => {
          return j.classId === selectedClass && j.subjectId === selectedSubject &&
            j.isImplemented === false &&
            moment(j.date).isBefore(currentDate);
        })
        .sort((a, b) => moment(b.date).diff(moment(a.date)))[0];

      setCarryOverSuggestion(carryOver || null);
    } else {
      setCarryOverSuggestion(null);
    }
  }, [selectedClass, selectedSubject, currentDate, journals]);

  useEffect(() => {
    if (material && material.length > 3 && journals.length > 0) {
      const normMaterial = material.trim().toLowerCase();
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

    if (!user) return;

    const classData = classes.find(cls => cls.id === selectedClass);
    const subjectData = subjects.find(sub => sub.id === selectedSubject);

    if (!classData || !subjectData) return;

    const journalData = {
      userId: user.uid,
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
      journalRef = doc(journalsCollectionRef, editingJournalId);
      batch.set(journalRef, journalData, { merge: true });
    } else {
      const uniqueJournalId = `${currentDate}-${classData.id}-${subjectData.id}`;
      journalRef = doc(journalsCollectionRef, uniqueJournalId);
      batch.set(journalRef, journalData, { merge: true });
    }

    const promise = batch.commit();

    toast.promise(promise, {
      loading: editingJournalId ? 'Menyimpan perubahan jurnal...' : 'Menyimpan jurnal...',
      success: () => {
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
        fetchJournalEntries(true);
        return editingJournalId ? 'Perubahan jurnal berhasil disimpan!' : 'Jurnal berhasil disimpan!';
      },
      error: "Gagal menyimpan jurnal.",
    });
  };

  const handleEditJournal = (journal: JournalEntry) => {
    setEditingJournalId(journal.id);
    setCurrentDate(journal.date);
    setSelectedClass(journal.classId);
    setSelectedSubject(journal.subjectId);
    setMaterial(journal.material);
    setLearningObjectives(journal.learningObjectives);
    setLearningActivities(journal.learningActivities);
    setReflection(journal.reflection);
    setChallenges(journal.challenges || '');
    setFollowUp(journal.followUp || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJournal = async (journalId: string) => {
    if (!user) return;
    const journalRef = doc(journalsCollectionRef, journalId);
    const promise = deleteDoc(journalRef);

    toast.promise(promise, {
      loading: 'Menghapus jurnal...',
      success: () => {
        fetchJournalEntries(true);
        return 'Jurnal berhasil dihapus!';
      },
      error: 'Gagal menghapus jurnal.',
    });
  };

  const plannedTopic = useMemo(() => {
    const classInfo = classes.find(c => c.id === selectedClass);
    const subjectInfo = subjects.find(s => s.id === selectedSubject);
    if (!classInfo || !subjectInfo) return null;
    
    return getTopicForSchedule(
      { subject: subjectInfo.name, class: classInfo.rombel, subjectId: selectedSubject, classId: selectedClass },
      currentDate,
      programs,
      classes,
      activeSemester,
      academicYear
    );
  }, [selectedClass, selectedSubject, currentDate, programs, classes, activeSemester, academicYear, subjects]);

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
        <div className="lg:w-1/3">
          <div className="sticky top-0 z-10 card-glass p-6 rounded-2xl shadow-lg mb-6 space-y-4">
            <StyledInput
              type="date"
              label="Tanggal"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
            />

            {currentDateHoliday && (
              <div className="flex items-start gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <CalendarOff size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-0.5">Hari Libur / Agenda Khusus</p>
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-200">{currentDateHoliday.name}</p>
                   <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 italic">Tanggal ini termasuk hari libur. Jika tetap mengisi jurnal, pertimbangkan untuk menandai sebagai &quot;Tidak Terlaksana&quot;.</p>
                </div>
              </div>
            )}

            {!isDateEffectiveStatus && selectedClass && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-0.5">⚠️ Pekan Tidak Efektif</p>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-200">Tanggal ini bukan pekan efektif pembelajaran</p>
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 italic">Pertimbangkan untuk memilih tanggal lain atau tandai sebagai &quot;Tidak Terlaksana&quot; jika tetap mengisi.</p>
                </div>
              </div>
            )}

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
              
              {carryOverSuggestion && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 shadow-sm transition-all">
                  <RefreshCw size={14} className="text-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase tracking-tighter leading-none mb-0.5">Materi Tertunda ({moment(carryOverSuggestion.date).format('DD/MM')}):</p>
                    <p className="text-[11px] font-bold text-red-700 dark:text-red-300 truncate italic">{carryOverSuggestion.material}</p>
                  </div>
                  <button onClick={() => {
                    setMaterial(carryOverSuggestion.material);
                    setLearningObjectives(carryOverSuggestion.learningObjectives || '');
                    setLearningActivities(carryOverSuggestion.learningActivities || '');
                  }} className="shrink-0 text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm">Lanjutkan</button>
                </div>
              )}

              {plannedTopic && (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 shadow-sm transition-all animate-in slide-in-from-top-1 duration-300">
                  <Zap size={14} className="text-green-600 shrink-0" fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-green-800 dark:text-green-400 uppercase tracking-tighter leading-none mb-0.5">Rencana Materi Promes:</p>
                    <p className="text-[11px] font-bold text-green-700 dark:text-green-300 truncate italic">{plannedTopic}</p>
                  </div>
                  <button onClick={() => setMaterial(plannedTopic.split(',')[0])} className="shrink-0 text-[10px] bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm">Gunakan</button>
                </div>
              )}

              {similarJournalSuggestion && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm transition-all animate-in slide-in-from-top-1 duration-300">
                  <BookOpen size={14} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-tighter leading-none mb-0.5">Materi Serupa Ditemukan:</p>
                    <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate italic">Copy dari {similarJournalSuggestion.className} ({moment(similarJournalSuggestion.date).format('DD/MM')})</p>
                  </div>
                  <button onClick={() => {
                    setLearningObjectives(similarJournalSuggestion.learningObjectives || '');
                    setLearningActivities(similarJournalSuggestion.learningActivities || '');
                    setReflection(similarJournalSuggestion.reflection || '');
                    setFollowUp(similarJournalSuggestion.followUp || '');
                    toast.success('Konten jurnal disalin!');
                  }} className="shrink-0 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm">Salin</button>
                </div>
              )}
            </div>

            <StyledInput
              type="textarea"
              label="Tujuan Pembelajaran"
              placeholder="Tujuan pembelajaran hari ini"
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
              className={isJavanese ? 'font-carakan' : ''}
              voiceEnabled
            />

            <StyledInput
              type="textarea"
              label="Kegiatan Pembelajaran"
              placeholder="Deskripsi kegiatan di kelas"
              value={learningActivities}
              onChange={(e) => setLearningActivities(e.target.value)}
              className={isJavanese ? 'font-carakan' : ''}
              voiceEnabled
            />

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
                placeholder="Jelaskan alasan materi tidak terlaksana"
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

        <div className="lg:w-2/3 overflow-x-auto">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{aiSummary || "Tidak ada ringkasan tersedia."}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Analisis Sentimen Keseluruhan</h4>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${aiSentimentPercentage}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{aiSentimentPercentage}% Positif</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{aiSentimentExplanation || "Tidak ada analisis sentimen tersedia."}</p>
                </div>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Daftar Jurnal Mengajar</h3>
          {journals.length > 0 ? (
            <div className="overflow-y-auto h-96">
              <StyledTable headers={['Tanggal', 'Kelas', 'Mata Pelajaran', 'Materi', 'Status', 'Aksi']}>
                {journals.slice().sort((a, b) => moment(b.date).diff(moment(a.date))).map(journal => (
                  <tr key={journal.id}>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm font-medium text-text-light dark:text-text-dark">{journal.date}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">{journal.className}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">{journal.subjectName}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">{journal.material}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                      {journal.isImplemented !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Terlaksana</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Tidak Terlaksana</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                      <StyledButton onClick={() => handleEditJournal(journal)} className="mr-2">Edit</StyledButton>
                      <StyledButton onClick={() => handleDeleteJournal(journal.id)} variant="danger" className="bg-red-500 hover:bg-red-600">Hapus</StyledButton>
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

