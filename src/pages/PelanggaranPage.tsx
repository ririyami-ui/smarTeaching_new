import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, orderBy, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { useSettings } from '../utils/SettingsContext';
import Modal from '../components/Modal';
import { formatDate, formatTime } from '../utils/dateUtils';
import { Trash2, Settings2, Plus, Edit2, Save, X, ShieldCheck, Star, Sparkles, UserCheck, Loader } from 'lucide-react';
import StyledInput from '../components/StyledInput';
import StyledButton from '../components/StyledButton';

interface ClassItem {
  id: string;
  rombel: string;
  level?: string;
}

interface StudentItem {
  id: string;
  name: string;
  absen?: string | number;
  classId?: string;
  rombel?: string;
}

interface InfractionTypeItem {
  id: string;
  name: string;
  points: number;
  sanction?: string;
}

interface AppreciationTypeItem {
  id: string;
  name: string;
  points: number;
  category?: string;
}

interface InfractionHistoryItem {
  id: string;
  userId: string;
  studentId: string;
  classId: string;
  rombel: string;
  date: string;
  infractionType: string;
  points: number;
  sanction: string;
  semester: string;
  academicYear: string;
}

interface AppreciationHistoryItem {
  id: string;
  userId: string;
  studentId: string;
  classId: string;
  rombel: string;
  date: string;
  type?: string;
  category?: string;
  points: number;
  semester: string;
  academicYear: string;
}

const DEFAULT_INFRACTION_TYPES: Record<string, { points: number; sanction: string }> = {
    'Tidur': { points: 5, sanction: 'Teguran lisan' },
    'Mengganggu teman': { points: 10, sanction: 'Teguran lisan & dicatat' },
    'Bertindak kurang sopan': { points: 15, sanction: 'Teguran keras & pemanggilan orang tua' },
    'Ramai di kelas': { points: 5, sanction: 'Teguran lisan' },
    'Tidak menghiraukan guru': { points: 10, sanction: 'Teguran lisan & dicatat' },
    'Terlambat masuk kelas': { points: 5, sanction: 'Teguran lisan' },
    'Sering ijin keluar': { points: 5, sanction: 'Pembatasan ijin keluar' },
    'Bolos pelajaran': { points: 15, sanction: 'Teguran keras & pemanggilan orang tua' },
    'Di luar kelas tanpa izin': { points: 5, sanction: 'Teguran lisan' },
    'Membuang sampah sembarangan': { points: 5, sanction: 'Teguran lisan' },
    'Mencontek': { points: 10, sanction: 'Teguran lisan & dicatat' },
    'Berbohong': { points: 10, sanction: 'Teguran lisan & dicatat' },
    'Perkelahian': { points: 20, sanction: 'Pemanggilan orang tua & skorsing' },
    'Membawa barang terlarang': { points: 25, sanction: 'Barang disita & pemanggilan orang tua' },
    'Membawa HP': { points: 10, sanction: 'HP disita & teguran lisan' },
    'Merokok': { points: 20, sanction: 'Pemanggilan orang tua & skorsing' },
    'Merusak fasilitas sekolah': { points: 25, sanction: 'Ganti rugi & pemanggilan orang tua' },
  };

const DEFAULT_APPRECIATION_TYPES: Record<string, { points: number; category: string }> = {
    'Membantu teman': { points: 1, category: 'Sosial' },
    'Aktif di kelas': { points: 1, category: 'Akademik' },
    'Berakhlak mulia': { points: 2, category: 'Karakter' },
    'Disiplin waktu': { points: 1, category: 'Karakter' },
    'Kebersihan diri & lingkungan': { points: 1, category: 'Lingkungan' },
    'Prestasi akademik': { points: 3, category: 'Akademik' },
    'Prestasi non-akademik': { points: 3, category: 'Bakat' },
    'Kejujuran (Integritas)': { points: 2, category: 'Karakter' },
    'Kepemimpinan': { points: 2, category: 'Karakter' },
};

const PelanggaranPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [activeTab, setActiveTab] = useState<'infractions' | 'appreciations'>('infractions');
  const [infractionType, setInfractionType] = useState('');
  const [appreciationType, setAppreciationType] = useState('');
  const [infractions, setInfractions] = useState<InfractionHistoryItem[]>([]);
  const [appreciations, setAppreciations] = useState<AppreciationHistoryItem[]>([]);
  const [studentScore, setStudentScore] = useState(100);
  const [attitude, setAttitude] = useState('Sangat Baik');
  const [customInfraction, setCustomInfraction] = useState('');
  const [customAppreciation, setCustomAppreciation] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dynamicInfractionTypes, setDynamicInfractionTypes] = useState<InfractionTypeItem[]>([]);
  const [dynamicAppreciationTypes, setDynamicAppreciationTypes] = useState<AppreciationTypeItem[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [showRoleModelModal, setShowRoleModelModal] = useState(false);
  const [roleModels, setRoleModels] = useState<StudentItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePoints, setNewTypePoints] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypePoints, setEditingTypePoints] = useState('');
  const [settingsTab, setSettingsTab] = useState<'infractions' | 'appreciations'>('infractions');

  const { activeSemester, academicYear } = useSettings();
  const location = useLocation();

  useEffect(() => {
    const fetchClasses = async () => {
      if (user) {
        const q = query(collection(db, 'classes'), where('userId', '==', user.uid), orderBy('rombel', 'asc'));
        const querySnapshot = await getDocs(q);
        setClasses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassItem)));
      }
    };
    fetchClasses();
  }, [user]);

  const fetchDynamicTypes = useCallback(async () => {
    if (!user) return;
    setIsSettingsLoading(true);
    try {
      const iq = query(collection(db, 'infraction_types'), where('userId', '==', user.uid));
      const iSnapshot = await getDocs(iq);
      const iTypes = iSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InfractionTypeItem));
      iTypes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDynamicInfractionTypes(iTypes);

      const aq = query(collection(db, 'appreciation_types'), where('userId', '==', user.uid));
      const aSnapshot = await getDocs(aq);
      const aTypes = aSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppreciationTypeItem));
      aTypes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDynamicAppreciationTypes(aTypes);

      if (iTypes.length === 0) {
        const batch = writeBatch(db);
        Object.entries(DEFAULT_INFRACTION_TYPES).forEach(([name, data]) => {
          batch.set(doc(collection(db, 'infraction_types')), { ...data, name, userId: user!.uid });
        });
        await batch.commit();
        fetchDynamicTypes();
      }

      if (aTypes.length === 0) {
        const batch = writeBatch(db);
        Object.entries(DEFAULT_APPRECIATION_TYPES).forEach(([name, data]) => {
          batch.set(doc(collection(db, 'appreciation_types')), { ...data, name, userId: user!.uid });
        });
        await batch.commit();
        fetchDynamicTypes();
      }
    } catch (error) {
      console.error("Error fetching types:", error);
      toast.error("Gagal memuat preferensi");
    } finally {
      setIsSettingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDynamicTypes();
  }, [user, fetchDynamicTypes]);

  useEffect(() => {
    const state = location.state as { classId?: string; studentId?: string } | null;
    if (state?.classId) {
      setSelectedClass(state.classId);
      if (state.studentId) {
        setSelectedStudent(state.studentId);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedClass && user) {
        const classObj = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
        const classIdToUse = classObj?.id || selectedClass;

        const q = query(
          collection(db, 'students'),
          where('userId', '==', user.uid),
          where('classId', '==', classIdToUse)
        );
        const querySnapshot = await getDocs(q);
        const fetchedStudents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentItem))
          .sort((a, b) => {
            const absenA = parseInt(a.absen as string) || 0;
            const absenB = parseInt(b.absen as string) || 0;
            if (absenA !== absenB) return absenA - absenB;
            return a.name.localeCompare(b.name);
          });
        setStudents(fetchedStudents);
      } else {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass, classes, user]);

  const handleSaveInfraction = async () => {
    if (!selectedStudent || !infractionType || !user) {
      toast.error('Silakan pilih siswa dan jenis pelanggaran.');
      return;
    }

    let infractionData: {
      userId: string;
      studentId: string;
      classId: string;
      rombel: string;
      date: string;
      infractionType: string;
      points: number;
      sanction: string;
      semester: string;
      academicYear: string;
    } = {
      userId: '',
      studentId: '',
      classId: '',
      rombel: '',
      date: '',
      infractionType: '',
      points: 0,
      sanction: '',
      semester: '',
      academicYear: '',
    };
    const classObj = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
    const classIdToSave = classObj?.id || selectedClass;
    const rombelToSave = classObj?.rombel || selectedClass;

    if (infractionType === 'Lainnya') {
      if (!customInfraction || !customPoints) {
        toast.error('Untuk pelanggaran "Lainnya", detail dan poin harus diisi.');
        return;
      }
      infractionData = {
        userId: user.uid,
        studentId: selectedStudent,
        classId: classIdToSave,
        rombel: rombelToSave,
        date: new Date().toISOString(),
        infractionType: customInfraction,
        points: parseInt(customPoints, 10),
        sanction: 'Dicatat sesuai kebijakan',
        semester: activeSemester,
        academicYear: academicYear
      };
    } else {
      const selectedType = dynamicInfractionTypes.find(t => t.name === infractionType);
      if (!selectedType) {
        toast.error('Jenis pelanggaran tidak ditemukan.');
        return;
      }
      infractionData = {
        userId: user.uid,
        studentId: selectedStudent,
        classId: classIdToSave,
        rombel: rombelToSave,
        date: new Date().toISOString(),
        infractionType,
        points: selectedType.points,
        sanction: selectedType.sanction || 'Teguran sesuai aturan',
        semester: activeSemester,
        academicYear: academicYear
      };
    }

    try {
      await addDoc(collection(db, 'infractions'), infractionData);
      toast.success('Pelanggaran berhasil dicatat.');
      fetchHistory(selectedStudent);
      setCustomInfraction('');
      setCustomPoints('');
      setInfractionType('');
    } catch (error) {
      toast.error('Gagal menyimpan data.');
      console.error("Error adding document: ", error);
    }
  };

  const handleSaveAppreciation = async () => {
    if (!selectedStudent || !appreciationType || !user) {
      toast.error('Silakan pilih siswa dan jenis apresiasi.');
      return;
    }

    const classObj = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
    const classIdToSave = classObj?.id || selectedClass;
    const rombelToSave = classObj?.rombel || selectedClass;

    let appData: Record<string, string | number | undefined> = {
      userId: user.uid,
      studentId: selectedStudent,
      classId: classIdToSave,
      rombel: rombelToSave,
      date: new Date().toISOString(),
      semester: activeSemester,
      academicYear: academicYear
    };

    if (appreciationType === 'Lainnya') {
      if (!customAppreciation || !customPoints) {
        toast.error('Detail dan poin harus diisi.');
        return;
      }
      appData = { ...appData, type: customAppreciation, points: parseInt(customPoints, 10) };
    } else {
      const selectedType = dynamicAppreciationTypes.find(t => t.name === appreciationType);
      appData = { ...appData, type: appreciationType, points: selectedType?.points || 1 };
    }

    try {
      await addDoc(collection(db, 'studentAppreciations'), appData);
      toast.success('Bintang berhasil diberikan! ⭐');
      fetchHistory(selectedStudent);
      setAppreciationType('');
      setCustomAppreciation('');
      setCustomPoints('');
    } catch {
      toast.error('Gagal memberikan bintang.');
    }
  };

  const handleDeleteAppreciation = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Apresiasi',
      message: 'Apakah Anda yakin ingin menghapus catatan bintang ini?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'studentAppreciations', id));
          toast.success('Apresiasi berhasil dihapus.');
          fetchHistory(selectedStudent);
        } catch {
          toast.error('Gagal menghapus.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));
        }
      }
    });
  };

  const handleDeleteInfraction = (infractionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pelanggaran',
      message: 'Apakah Anda yakin ingin menghapus catatan pelanggaran ini?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'infractions', infractionId));
          toast.success('Pelanggaran berhasil dihapus.');
          fetchHistory(selectedStudent);
        } catch (error) {
          toast.error('Gagal menghapus pelanggaran.');
          console.error("Error removing document: ", error);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));
        }
      }
    });
  };

  const fetchHistory = useCallback(async (studentId: string) => {
    if (!studentId || !user) return;
    try {
      const baseQ = [
        where('userId', '==', user.uid),
        where('studentId', '==', studentId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      ];

      const [iSnap, aSnap] = await Promise.all([
        getDocs(query(collection(db, 'infractions'), ...baseQ, orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'studentAppreciations'), ...baseQ, orderBy('date', 'desc')))
      ]);

      const iList = iSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as InfractionHistoryItem));
      const aList = aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as AppreciationHistoryItem));

      setInfractions(iList);
      setAppreciations(aList);
      calculateScore(iList, aList);
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  }, [user, activeSemester, academicYear]);

  const calculateScore = (infractionsList: InfractionHistoryItem[], appreciationsList: AppreciationHistoryItem[]) => {
    const totalDeducted = infractionsList.reduce((acc, curr) => acc + (curr.points || 0), 0);
    const totalStars = appreciationsList.reduce((acc, curr) => acc + (curr.points || 0), 0);
    const rawScore = 100 - totalDeducted + (totalStars * 2);
    const currentScore = Math.min(100, Math.max(0, rawScore));
    setStudentScore(currentScore);

    if (currentScore > 90) setAttitude('Sangat Baik');
    else if (currentScore >= 75) setAttitude('Baik');
    else if (currentScore >= 60) setAttitude('Cukup');
    else setAttitude('Kurang');
  };

  const handleCheckRoleModels = async () => {
    if (!selectedClass || !user) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    setIsScanning(true);
    try {
      const classObj = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
      const classIdToUse = classObj?.id || selectedClass;

      const iQuery = query(
        collection(db, 'infractions'),
        where('userId', '==', user.uid),
        where('classId', '==', classIdToUse),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const iSnap = await getDocs(iQuery);
      const studentWithInfractions = new Set(iSnap.docs.map(doc => doc.data().studentId));

      const candidates = students.filter(s => !studentWithInfractions.has(s.id));

      setRoleModels(candidates);
      setShowRoleModelModal(true);
    } catch {
      toast.error('Gagal memindai data');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAwardConsistencyStar = async (studentId: string) => {
    if (!user) return;
    try {
      const classObj = classes.find(c => c.rombel === selectedClass || c.id === selectedClass);
      await addDoc(collection(db, 'studentAppreciations'), {
        userId: user.uid,
        studentId,
        classId: classObj?.id || selectedClass,
        rombel: classObj?.rombel || selectedClass,
        date: new Date().toISOString(),
        type: 'Bintang Konsistensi (Nol Pelanggaran)',
        points: 2,
        semester: activeSemester,
        academicYear: academicYear
      });
      toast.success('Bintang Konsistensi diberikan! 🌟');
      setRoleModels(prev => prev.filter(s => s.id !== studentId));
      if (selectedStudent === studentId) fetchHistory(studentId);
    } catch {
      toast.error('Gagal memberikan bintang');
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchHistory(selectedStudent);
    } else {
      setInfractions([]);
      setAppreciations([]);
      setStudentScore(100);
      setAttitude('Sangat Baik');
    }
  }, [selectedStudent, activeSemester, academicYear, fetchHistory]);

  const handleAddType = async () => {
    if (!newTypeName.trim() || !newTypePoints || !user) {
      toast.error("Nama dan Poin wajib diisi");
      return;
    }
    const collectionName = settingsTab === 'infractions' ? 'infraction_types' : 'appreciation_types';
    try {
      await addDoc(collection(db, collectionName), {
        name: newTypeName.trim(),
        points: parseInt(newTypePoints, 10),
        userId: user.uid,
        ...(settingsTab === 'infractions' ? { sanction: 'Teguran sesuai aturan' } : { category: 'Umum' })
      });
      toast.success(`${settingsTab === 'infractions' ? 'Pelanggaran' : 'Apresiasi'} ditambahkan`);
      setNewTypeName('');
      setNewTypePoints('');
      fetchDynamicTypes();
    } catch {
      toast.error("Gagal menambah data");
    }
  };

  const handleUpdateType = async (id: string) => {
    if (!editingTypeName.trim() || !editingTypePoints) return;
    const collectionName = settingsTab === 'infractions' ? 'infraction_types' : 'appreciation_types';
    try {
      await updateDoc(doc(db, collectionName, id), {
        name: editingTypeName.trim(),
        points: parseInt(editingTypePoints, 10)
      });
      toast.success("Berhasil diperbarui");
      setEditingTypeId(null);
      fetchDynamicTypes();
    } catch {
      toast.error("Gagal memperbarui");
    }
  };

  const handleDeleteType = async (id: string) => {
    const isInf = settingsTab === 'infractions';
    setConfirmModal({
      isOpen: true,
      title: `Hapus Jenis ${isInf ? 'Pelanggaran' : 'Apresiasi'}`,
      message: `Apakah Anda yakin ingin menghapus jenis ${isInf ? 'pelanggaran' : 'apresiasi'} ini? Data history siswa tidak akan terhapus.`,
      onConfirm: async () => {
        const collectionName = settingsTab === 'infractions' ? 'infraction_types' : 'appreciation_types';
        try {
          await deleteDoc(doc(db, collectionName, id));
          toast.success("Berhasil dihapus");
          fetchDynamicTypes();
        } catch {
          toast.error("Gagal menghapus");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));
        }
      }
    });
  };

  return (
    <div className="p-4 md:p-6 card-glass rounded-2xl shadow-xl transition-all border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            Poin Karakter Peserta Didik
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Kelola kedisiplinan dan apresiasi prestasi siswa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StyledButton
            onClick={handleCheckRoleModels}
            variant="primary"
            className="flex items-center gap-2 group whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-none text-white"
            disabled={isScanning || !selectedClass}
          >
            {isScanning ? <Loader className="animate-spin" size={18} /> : <Sparkles size={18} className="animate-pulse" />}
            Bintang Konsistensi
          </StyledButton>
          <StyledButton
            onClick={() => setIsSettingsOpen(true)}
            variant="secondary"
            className="flex items-center gap-2 group whitespace-nowrap"
          >
            <Settings2 size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            Pengaturan Poin
          </StyledButton>
        </div>
      </div>

      {/* TABS */}
      <div className="flex p-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-2xl mb-8 w-full md:w-fit">
        <button
          onClick={() => setActiveTab('infractions')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'infractions'
            ? 'bg-red-600 text-white shadow-lg'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
        >
          <Trash2 size={16} />
          Pelanggaran
        </button>
        <button
          onClick={() => setActiveTab('appreciations')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'appreciations'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
        >
          <Plus size={16} />
          Apresiasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 ml-1 text-[10px]">Tanggal</label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-medium">
            {formatDate(new Date())}
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 ml-1 text-[10px]">Kelas</label>
          <select
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudent('');
            }}
            value={selectedClass}
            className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white font-medium"
          >
            <option value="">-- Pilih Kelas --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 ml-1 text-[10px]">Nama Peserta Didik</label>
          <select
            onChange={(e) => setSelectedStudent(e.target.value)}
            value={selectedStudent}
            className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white font-medium"
            disabled={!selectedClass}
          >
            <option value="">-- Cari atau Pilih Peserta Didik --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-8 overflow-hidden">
        {activeTab === 'infractions' ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex justify-between items-end mb-3 px-1">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                Pilih Jenis Pelanggaran
              </h3>
              <span className="text-[10px] text-gray-400 italic">Klik untuk memilih</span>
            </div>
            <div className="flex flex-wrap gap-2 p-5 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/20">
              {dynamicInfractionTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setInfractionType(type.name)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${infractionType === type.name
                    ? 'bg-red-600 text-white shadow-lg translate-y-[-2px]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-red-600'
                    }`}
                >
                  {type.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${infractionType === type.name ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {type.points} pts
                  </span>
                </button>
              ))}
              <button
                onClick={() => setInfractionType('Lainnya')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${infractionType === 'Lainnya'
                  ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-800'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
              >
                Lainnya...
              </button>
            </div>

            {infractionType === 'Lainnya' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="md:col-span-2">
                  <StyledInput
                    label="Detail Pelanggaran Luar Daftar"
                    value={customInfraction}
                    onChange={(e) => setCustomInfraction(e.target.value)}
                    placeholder="Contoh: Menggunakan seragam tidak sesuai aturan"
                    voiceEnabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Poin (Potongan)</label>
                  <input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value)}
                    className="w-full p-2.5 card-glass border-2 border-red-200 dark:border-red-900/30 rounded-xl focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                    placeholder="Misal: 10"
                  />
                </div>
              </div>
            )}

            <StyledButton
              onClick={handleSaveInfraction}
              className="w-full py-4 mt-6 text-base font-bold"
              variant="danger"
              disabled={!selectedStudent || !infractionType}
            >
              <Save className="mr-2" size={20} />
              Simpan Pelanggaran
            </StyledButton>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end mb-3 px-1">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                Pilih Jenis Apresiasi ⭐
              </h3>
              <span className="text-[10px] text-gray-400 italic">Klik untuk memberi bintang</span>
            </div>
            <div className="flex flex-wrap gap-2 p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
              {dynamicAppreciationTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setAppreciationType(type.name)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${appreciationType === type.name
                    ? 'bg-blue-600 text-white shadow-lg translate-y-[-2px]'
                    : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:border-blue-400'
                    }`}
                >
                  {type.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${appreciationType === type.name ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    +{type.points} ⭐
                  </span>
                </button>
              ))}
              <button
                onClick={() => setAppreciationType('Lainnya')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${appreciationType === 'Lainnya'
                  ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-800'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
              >
                Lainnya...
              </button>
            </div>

            {appreciationType === 'Lainnya' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="md:col-span-2">
                  <StyledInput
                    label="Detail Apresiasi Luar Daftar"
                    value={customAppreciation}
                    onChange={(e) => setCustomAppreciation(e.target.value)}
                    placeholder="Contoh: Sangat berani saat presentasi"
                    voiceEnabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Jumlah Bintang</label>
                  <input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value)}
                    className="w-full p-2.5 card-glass border-2 border-blue-200 dark:border-blue-900/30 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    placeholder="Misal: 1-5"
                  />
                </div>
              </div>
            )}

            <StyledButton
              onClick={handleSaveAppreciation}
              className="w-full py-4 mt-6 text-base font-bold"
              variant="primary"
              disabled={!selectedStudent || !appreciationType}
            >
              <Save className="mr-2" size={20} />
              Simpan Apresiasi ⭐
            </StyledButton>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="mt-12 space-y-6 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 p-5 bg-gray-50 dark:bg-gray-700/30 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Total Bintang</span>
              <div className="flex items-center gap-1 text-2xl font-black text-blue-600">
                <Plus size={18} /> {appreciations.reduce((sum, a) => sum + (a.points || 0), 0)} ⭐
              </div>
            </div>
            <div className="flex-1 p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700"></div>
              <span className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] mb-2 z-10">Poin Pelanggaran</span>
              <span className="text-4xl font-black text-red-600 dark:text-red-400 z-10 drop-shadow-sm">
                -{infractions.reduce((sum, i) => sum + (i.points || 0), 0)}
              </span>
            </div>
            <div className="flex-1 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex flex-col justify-center items-center text-center relative group">
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-blue-500/5 rounded-full -translate-x-1/2 translate-y-1/2 group-hover:scale-150 transition-transform duration-700"></div>
              <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em] mb-2">Skor Akhir & Predikat</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-gray-800 dark:text-white">{studentScore}</span>
                <span className={`text-base font-black px-3 py-1 rounded-xl ${studentScore > 90 ? 'bg-green-500 text-white' : studentScore >= 75 ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {attitude}
                </span>
              </div>
            </div>
          </div>

          <div className="card-glass rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {activeTab === 'infractions' ? 'Daftar Pelanggaran' : 'Daftar Apresiasi'}
                <span className="bg-gray-200 dark:bg-gray-700 text-[10px] px-2 py-0.5 rounded-full">
                  {activeTab === 'infractions' ? infractions.length : appreciations.length}
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              {activeTab === 'infractions' ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/20">
                      <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Waktu</th>
                      <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jenis Pelanggaran</th>
                      <th className="py-4 px-6 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Potongan</th>
                      <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sanksi</th>
                      <th className="py-4 px-6 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {infractions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">Belum ada catatan pelanggaran.</td>
                      </tr>
                    ) : (
                      infractions.map(inf => (
                        <tr key={inf.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {formatDate(inf.date, 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {formatTime(inf.date, 'id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{inf.infractionType}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-sm font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg">-{inf.points} pts</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1">{inf.sanction}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeleteInfraction(inf.id)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                      <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Waktu</th>
                      <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jenis Apresiasi</th>
                      <th className="py-4 px-6 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bonus</th>
                      <th className="py-4 px-6 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {appreciations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">Belum ada catatan apresiasi.</td>
                      </tr>
                    ) : (
                      appreciations.map(app => (
                        <tr key={app.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {formatDate(app.date, 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {formatTime(app.date, 'id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                              {app.type || (app.category ? (app.category.charAt(0).toUpperCase() + app.category.slice(1)) : 'Apresiasi')} ⭐
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">+{app.points} ⭐</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeleteAppreciation(app.id)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showRoleModelModal && (
        <Modal onClose={() => setShowRoleModelModal(false)}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-amber-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Apresiasi Konsistensi</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daftar siswa yang belum pernah melanggar di semester ini.</p>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {roleModels.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 italic">Semua siswa sudah mendapat apresiasi atau tidak ada data.</p>
              </div>
            ) : (
              roleModels.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 hover:border-amber-300 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 card-glass rounded-full flex items-center justify-center border border-gray-100 dark:border-gray-700">
                      <UserCheck size={20} className="text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1">{student.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Nol Pelanggaran Terdeteksi</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAwardConsistencyStar(student.id)}
                    className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all active:scale-95 group"
                    title="Beri Bintang Konsistensi"
                  >
                    <Star size={18} className="group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <StyledButton
              onClick={() => setShowRoleModelModal(false)}
              variant="secondary"
              className="w-full"
            >
              Tutup
            </StyledButton>
          </div>
        </Modal>
      )}

      {isSettingsOpen && (
        <Modal onClose={() => {
          setIsSettingsOpen(false);
          setEditingTypeId(null);
        }}>
          <div className="max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <Settings2 className="text-blue-500" />
                Pengaturan Poin & Bintang
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDynamicTypes}
                  disabled={isSettingsLoading}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition flex items-center gap-2 text-xs font-bold"
                  title="Sinkronisasi Ulang / Muat Data Awal"
                >
                  <Settings2 size={16} className={isSettingsLoading ? 'animate-spin' : ''} />
                  Sinkronisasi
                </button>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
              <button
                onClick={() => setSettingsTab('infractions')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${settingsTab === 'infractions' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-600' : 'text-gray-500'}`}
              >
                Pelanggaran
              </button>
              <button
                onClick={() => setSettingsTab('appreciations')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${settingsTab === 'appreciations' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                Apresiasi
              </button>
            </div>

            <div className={`p-5 rounded-2xl border mb-6 ${settingsTab === 'infractions' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/20' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/20'}`}>
              <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${settingsTab === 'infractions' ? 'text-red-600' : 'text-blue-600'}`}>
                <Plus size={14} />
                Tambah {settingsTab === 'infractions' ? 'Jenis Pelanggaran' : 'Jenis Apresiasi'}
              </h4>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder={settingsTab === 'infractions' ? 'Nama Pelanggaran (misal: Berkelahi)' : 'Nama Apresiasi (misal: Membantu Teman)'}
                    className="w-full p-2.5 card-glass border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-full md:w-32">
                  <input
                    type="number"
                    value={newTypePoints}
                    onChange={(e) => setNewTypePoints(e.target.value)}
                    placeholder="Poin"
                    className="w-full p-2.5 card-glass border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <StyledButton variant={settingsTab === 'infractions' ? 'danger' : 'primary'} onClick={handleAddType} className="h-[42px] px-6">
                  Tambah
                </StyledButton>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {isSettingsLoading ? (
                <div className="text-center py-10 text-gray-400">Memuat data...</div>
              ) : (settingsTab === 'infractions' ? dynamicInfractionTypes : dynamicAppreciationTypes).map(type => (
                <div key={type.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group">
                  {editingTypeId === type.id ? (
                    <div className="flex flex-grow gap-2">
                      <input
                        autoFocus
                        value={editingTypeName}
                        onChange={(e) => setEditingTypeName(e.target.value)}
                        className="flex-grow p-1.5 border rounded-lg dark:bg-gray-800 text-sm dark:text-white"
                      />
                      <input
                        type="number"
                        value={editingTypePoints}
                        onChange={(e) => setEditingTypePoints(e.target.value)}
                        className="w-20 p-1.5 border rounded-lg dark:bg-gray-800 text-sm dark:text-white"
                      />
                      <button onClick={() => handleUpdateType(type.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setEditingTypeId(null)} className="p-2 bg-gray-400 text-white rounded-lg transition">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center card-glass rounded-xl font-black text-xs shadow-sm ${settingsTab === 'infractions' ? 'text-red-500' : 'text-blue-500'}`}>
                          {settingsTab === 'infractions' ? '-' : '+'}{type.points}
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200">{type.name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingTypeId(type.id);
                            setEditingTypeName(type.name);
                            setEditingTypePoints(String(type.points));
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(settingsTab === 'infractions' ? dynamicInfractionTypes : dynamicAppreciationTypes).length === 0 && (
                <div className="text-center py-10 text-gray-400 italic text-sm">Belum ada jenis {settingsTab === 'infractions' ? 'pelanggaran' : 'apresiasi'} yang ditambahkan.</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))}>
          <div className="text-center py-4">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">{confirmModal.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))}
                className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-gray-200 transition active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm || undefined}
                className="flex-1 px-6 py-3.5 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-xl shadow-red-200 dark:shadow-none transition active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PelanggaranPage;


