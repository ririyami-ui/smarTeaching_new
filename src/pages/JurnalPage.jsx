import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { analyzeTeachingJournals } from '../utils/gemini'; // Add this line
import toast from 'react-hot-toast';
import StyledInput from '../components/StyledInput';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import StyledTable from '../components/StyledTable';

export default function JurnalPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [learningActivities, setLearningActivities] = useState('');
  const [reflection, setReflection] = useState('');
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

  const classesCollectionRef = collection(db, 'classes');
  const subjectsCollectionRef = collection(db, 'subjects');
  const journalsCollectionRef = collection(db, 'teachingJournals');

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
        setClasses(classesData.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const subjectsQuery = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
        const subjectsData = await getDocs(subjectsQuery);
        setSubjects(subjectsData.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
  }, []);

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const q = query(journalsCollectionRef, where('userId', '==', auth.currentUser.uid), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedJournals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJournals(fetchedJournals);

      // --- Start AI Analysis ---
      setIsAnalyzingAI(true);
      const aiResults = await analyzeTeachingJournals(fetchedJournals);
      setAiSummary(aiResults.summary);
      setAiSentimentPercentage(aiResults.sentiment.percentage);
      setAiSentimentExplanation(aiResults.sentiment.explanation);
      setIsAnalyzingAI(false);
      // --- End AI Analysis ---

    } catch (error) {
      console.error("Error fetching journal entries: ", error);
      toast.error('Gagal memuat jurnal mengajar.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.currentUser, analyzeTeachingJournals]);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  const handleSaveJournal = async () => {
    if (!selectedClass || !selectedSubject || !material || !learningObjectives || !learningActivities) {
      toast.error('Harap lengkapi semua informasi wajib (Kelas, Mata Pelajaran, Materi, Tujuan, Kegiatan).');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Anda harus login untuk menyimpan jurnal.');
      return;
    }

    const classData = classes.find(cls => cls.rombel === selectedClass);
    const subjectData = subjects.find(sub => sub.name === selectedSubject);

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
      challenges: challenges,
      followUp: followUp,
      timestamp: serverTimestamp(),
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
        setChallenges('');
        setFollowUp('');
        setEditingJournalId(null);
        fetchJournalEntries(); // Refresh the list
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
    setSelectedClass(journal.className);
    setSelectedSubject(journal.subjectName);
    setMaterial(journal.material);
    setLearningObjectives(journal.learningObjectives);
    setLearningActivities(journal.learningActivities);
    setReflection(journal.reflection);
    setChallenges(journal.challenges);
    setFollowUp(journal.followUp);
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
        fetchJournalEntries(); // Refresh the list
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
              readOnly
            />

            <StyledSelect
              label="Kelas"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Pilih Kelas</option>
              {classes.slice().sort((a, b) => a.rombel.localeCompare(b.rombel)).map(cls => (
                <option key={cls.id} value={cls.rombel}>{cls.rombel}</option>
              ))}
            </StyledSelect>

            <StyledSelect
              label="Mata Pelajaran"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </StyledSelect>

            <StyledInput
              type="text"
              label="Materi"
              placeholder="Materi yang diajarkan"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />

            <StyledInput
              type="textarea"
              label="Tujuan Pembelajaran"
              placeholder="Tujuan pembelajaran hari ini"
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
            />

            <StyledInput
              type="textarea"
              label="Kegiatan Pembelajaran"
              placeholder="Deskripsi kegiatan di kelas"
              value={learningActivities}
              onChange={(e) => setLearningActivities(e.target.value)}
            />

            <StyledInput
              type="textarea"
              label="Refleksi"
              placeholder="Refleksi diri setelah mengajar"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />

            <StyledInput
              type="textarea"
              label="Hambatan"
              placeholder="Hambatan yang dihadapi"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
            />

            <StyledInput
              type="textarea"
              label="Tindak Lanjut"
              placeholder="Rencana tindak lanjut"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />

            <div className="mt-6 flex justify-end">
              <StyledButton onClick={handleSaveJournal}>
                {editingJournalId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
              </StyledButton>
              {editingJournalId && (
                <StyledButton onClick={() => setEditingJournalId(null)} className="ml-2 bg-gray-500 hover:bg-gray-600">
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
              <StyledTable headers={['Tanggal', 'Kelas', 'Mata Pelajaran', 'Materi', 'Aksi']}>
                {journals.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(journal => (
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
