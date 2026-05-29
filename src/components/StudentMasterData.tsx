import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledSelect from './StyledSelect';
import StyledTable from './StyledTable';
import { Plus, Upload, Download, Edit, Trash2, Scale } from 'lucide-react';
import Modal from './Modal';
import StudentEditor from './StudentEditor';
import { formatDate } from '../utils/dateUtils';

interface StudentRecord {
  id: string;
  code: string;
  nis: string;
  nisn: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  classId: string;
  rombel: string;
  absen: string;
  userId: string;
  [key: string]: unknown;
}

interface ClassInfo {
  id: string;
  rombel: string;
  [key: string]: unknown;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => Promise<void>) | null;
}

export default function StudentMasterData() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newNIS, setNewNIS] = useState('');
  const [newNISN, setNewNISN] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newBirthPlace, setNewBirthPlace] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newAbsen, setNewAbsen] = useState('');
  const [lastUsedCode, setLastUsedCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [, setRombels] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedRombelFilter, setSelectedRombelFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ isOpen: false, title: '', message: '', onConfirm: null });
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedPromoteStudents, setSelectedPromoteStudents] = useState<string[]>([]);

  // Cari kode terakhir yang digunakan secara keseluruhan untuk petunjuk
  useEffect(() => {
    if (students.length > 0) {
      // Urutkan secara lokal untuk mencari kode "tertinggi"
      const sortedByCode = [...students].sort((a, b) => String(b.code).localeCompare(String(a.code), undefined, { numeric: true }));
      if (sortedByCode[0]?.code) {
        setLastUsedCode(sortedByCode[0].code);
      }
    }
  }, [students]);

  // Hitung otomatis nomor absen berikutnya secara lokal
  useEffect(() => {
    // Jika tidak ada kelas yang dipilih, nomor absen tidak dapat dihitung.
    if (!newClassId) {
      setNewAbsen('');
      return;
    }

    const selectedClassObj = classes.find(c => c.id === newClassId);

    // Saring siswa yang termasuk dalam kelas ini (berdasarkan ID atau nama Rombel)
    // Gunakan pencocokan peka huruf besar-kecil dan spasi untuk nama Rombel agar aman
    const classStudents = students.filter(s => {
      const matchId = s.classId && s.classId === newClassId;
      const matchRombel = selectedClassObj &&
        s.rombel &&
        s.rombel.trim().toLowerCase() === selectedClassObj.rombel.trim().toLowerCase();
      return matchId || matchRombel;
    });

    const existingAbsen = classStudents
      .map(s => parseInt(s.absen))
      .filter(n => !isNaN(n));

    const maxAbsen = existingAbsen.length > 0 ? Math.max(...existingAbsen) : 0;
    setNewAbsen(String(maxAbsen + 1));
  }, [newClassId, students, classes]);

  const handleEditStudent = (student: StudentRecord) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSaveStudent = () => {
    getStudents(); // Segarkan daftar setelah menyimpan
    handleCloseModal();
  };

  const studentsCollectionRef = collection(db, 'students');
  const classesCollectionRef = collection(db, 'classes');

  const getStudents = useCallback(async () => {
    if (!user) {
      setStudents([]);
      return;
    }
    try {
      // Hapus orderBy('code') untuk menghindari persyaratan indeks yang dapat menyebabkan kegagalan kueri
      const q = query(studentsCollectionRef, where('userId', '==', user?.uid));
      const data = await getDocs(q);
      setStudents(data.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StudentRecord)));
    } catch (error) {
      console.error("Error getting students: ", error);
      toast.error('Gagal memuat data siswa.');
    }
  }, [studentsCollectionRef, user]);

  // State turunan untuk tabel — diurutkan secara utama berdasarkan Kelas (Rombel), kemudian berdasarkan nomor absen (numerik)
  const filteredStudents = (selectedRombelFilter
    ? students.filter(s => (s.classId === selectedRombelFilter || s.rombel === selectedRombelFilter))
    : students
  ).sort((a, b) => {
    // 1. Urutkan berdasarkan Kelas (Rombel) terlebih dahulu secara alfabetis & numerik (misal VII-A sebelum VII-B)
    const rombelA = a.rombel || '';
    const rombelB = b.rombel || '';
    const rombelComp = rombelA.localeCompare(rombelB, undefined, { numeric: true, sensitivity: 'base' });
    if (rombelComp !== 0) return rombelComp;

    // 2. Jika di kelas yang sama, urutkan berdasarkan Nomor Absen secara numerik
    const absA = parseInt(a.absen) || 0;
    const absB = parseInt(b.absen) || 0;
    if (absA !== absB) return absA - absB;

    // 3. Jika nomor absen sama atau kosong, urutkan berdasarkan Nama secara abjad
    return (a.name || '').localeCompare(b.name || '');
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const getRombels = async () => {
          try {
            const q = query(classesCollectionRef, where('userId', '==', user.uid));
            const data = await getDocs(q);
            const classList: ClassInfo[] = data.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ClassInfo)).sort((a: ClassInfo, b: ClassInfo) => a.rombel.localeCompare(b.rombel));
            setClasses(classList);
            const rombelNames = classList.map(c => c.rombel);
            setRombels(rombelNames);
          } catch (error) {
            console.error("Error getting rombels: ", error);
            toast.error('Gagal memuat data rombel.');
          }
        };
        getRombels();
        getStudents();
      } else {
        setStudents([]);
        setRombels([]);
      }
    });
    return () => unsubscribe();
  }, [getStudents, classesCollectionRef]);

  useEffect(() => {
    getStudents();
  }, [getStudents]);

  const addStudent = async () => {
    if (!newStudentCode || !newNIS || !newNISN || !newStudentName || !newGender || !newBirthPlace || !newBirthDate || !newClassId || !newAbsen) {
      toast.error('Lengkapi semua detail siswa, termasuk no. absen.');
      return;
    }
    if (!user) {
      toast.error('Silakan login untuk menambah siswa.');
      return;
    }

    const selectedClassObj = classes.find(c => c.id === newClassId);
    const savedCode = newStudentCode; // Capture before clearing

    const promise = addDoc(studentsCollectionRef, {
      code: newStudentCode,
      nis: newNIS,
      nisn: newNISN,
      name: newStudentName,
      gender: newGender,
      birthPlace: newBirthPlace,
      birthDate: newBirthDate,
      classId: newClassId,
      rombel: selectedClassObj?.rombel || '',
      absen: newAbsen,
      userId: user.uid,
    });

    // Selalu refresh data setelah selesai (sukses maupun gagal)
    promise
      .then(() => {
        setNewStudentCode('');
        setNewNIS('');
        setNewNISN('');
        setNewStudentName('');
        setNewGender('');
        setNewBirthPlace('');
        setNewBirthDate('');
        setNewClassId('');
        setNewAbsen('');
        setLastUsedCode(savedCode);
        getStudents(); // Refresh list agar semua siswa tampil
      })
      .catch(() => { }); // Error sudah ditangani toast.promise

    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: 'Siswa berhasil ditambahkan!',
      error: 'Gagal menambah siswa.',
    });
  };

  const deleteStudent = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Siswa',
      message: 'Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        const promise = deleteDoc(doc(db, 'students', id));
        toast.promise(promise, {
          loading: 'Menghapus...',
          success: () => {
            getStudents();
            setConfirmModal((prev: ConfirmModalState) => ({ ...prev, isOpen: false }));
            return 'Siswa berhasil dihapus!';
          },
          error: 'Gagal menghapus siswa.',
        });
      }
    });
  };

  const handlePromoteStudents = async () => {
    if (!sourceClassId || !targetClassId) {
      toast.error('Pilih Rombel Asal dan Rombel Tujuan.');
      return;
    }
    if (sourceClassId === targetClassId) {
      toast.error('Rombel Asal dan Rombel Tujuan tidak boleh sama.');
      return;
    }
    if (selectedPromoteStudents.length === 0) {
      toast.error('Pilih minimal satu siswa untuk kenaikan kelas.');
      return;
    }

    const sourceClassObj = classes.find(c => c.id === sourceClassId);
    const targetClassObj = classes.find(c => c.id === targetClassId);

    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Kenaikan Kelas',
      message: `Apakah Anda yakin ingin memindahkan ${selectedPromoteStudents.length} siswa terpilih dari Rombel ${sourceClassObj?.rombel} ke ${targetClassId === 'alumni' ? 'ALUMNI / Lulus' : 'Rombel ' + targetClassObj?.rombel}? Siswa yang tidak dicentang tetap tinggal di kelas saat ini.`,
      onConfirm: async () => {
        const toastId = toast.loading('Memproses kenaikan kelas...');
        try {
          const promises = selectedPromoteStudents.map(studentId => {
            const studentDocRef = doc(db, 'students', studentId);
            if (targetClassId === 'alumni') {
              return updateDoc(studentDocRef, {
                classId: 'alumni',
                rombel: 'ALUMNI'
              });
            } else {
              return updateDoc(studentDocRef, {
                classId: targetClassId,
                rombel: targetClassObj?.rombel || ''
              });
            }
          });

          await Promise.all(promises);
          toast.success(`Berhasil menaikkan ${selectedPromoteStudents.length} siswa!`, { id: toastId });
          handleClosePromoteModal();
          setConfirmModal((prev: ConfirmModalState) => ({ ...prev, isOpen: false }));
          getStudents();
        } catch (error) {
          console.error("Error promoting students: ", error);
          toast.error('Gagal memproses kenaikan kelas.', { id: toastId });
        }
      }
    });
  };

  // State turunan untuk siswa di kelas yang sedang dinaikkan
  const promoteClassStudents = sourceClassId 
    ? students.filter(s => s.classId === sourceClassId)
    : [];

  // Secara otomatis centang semua siswa saat Rombel Asal dipilih
  useEffect(() => {
    if (sourceClassId) {
      const studentIds = students.filter(s => s.classId === sourceClassId).map(s => s.id);
      setSelectedPromoteStudents(studentIds);
    } else {
      setSelectedPromoteStudents([]);
    }
  }, [sourceClassId, students]);

  const handleToggleStudentPromote = (id: string) => {
    setSelectedPromoteStudents(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPromote = () => {
    if (selectedPromoteStudents.length === promoteClassStudents.length) {
      setSelectedPromoteStudents([]);
    } else {
      setSelectedPromoteStudents(promoteClassStudents.map(s => s.id));
    }
  };

  const handleClosePromoteModal = () => {
    setIsPromoteModalOpen(false);
    setSourceClassId('');
    setTargetClassId('');
    setSelectedPromoteStudents([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const input = event.target as HTMLInputElement;
    setFile(input.files?.[0] || null);
  };

  // Penormal Tanggal Pintar (Serial Excel, DD/MM/YYYY, atau Teks Indonesia)
  const normalizeImportDate = (input: unknown): string => {
    if (!input) return '';

    // 1. Tangani Serial Excel (Angka)
    if (typeof input === 'number') {
      const utc_days = Math.floor(input - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const year = date_info.getFullYear();
      const month = String(date_info.getMonth() + 1).padStart(2, '0');
      const day = String(date_info.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. Tangani Format String
    if (typeof input === 'string') {
      const str = input.trim();

      // Format standar YYYY-MM-DD -> Kembalikan apa adanya
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

      // Format DD/MM/YYYY atau DD-MM-YYYY
      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
      }

      // Format DD Bulan YYYY (Indonesia, contoh: "20 Januari 2010" atau "20 Jan 2010")
      const monthMap = {
        'januari': '01', 'jan': '01',
        'februari': '02', 'feb': '02', 'pebruari': '02',
        'maret': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'mei': '05', 'may': '05',
        'juni': '06', 'jun': '06',
        'juli': '07', 'jul': '07',
        'agustus': '08', 'ags': '08', 'aug': '08',
        'september': '09', 'sep': '09',
        'oktober': '10', 'okt': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'desember': '12', 'des': '12', 'dec': '12'
      };

      const textMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
      if (textMatch) {
        const day = textMatch[1].padStart(2, '0');
        const monthRaw = textMatch[2].toLowerCase();
        const year = textMatch[3];
        const month = monthMap[monthRaw as keyof typeof monthMap];

        if (month) return `${year}-${month}-${day}`;
      }

      // Coba Parser Tanggal bawaan Javascript sebagai cadangan
      const dateObj = new Date(str);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return String(input);
  };

  const normalizeGender = (input: unknown): string => {
    if (!input) return '';
    const clean = String(input).trim().toUpperCase();
    if (clean === 'L' || clean === 'LAKI-LAKI' || clean === 'LAKI' || clean === 'PRIA') return 'Laki-laki';
    if (clean === 'P' || clean === 'PEREMPUAN' || clean === 'WANITA') return 'Perempuan';
    return String(input);
  };

  const importStudents = async () => {
    if (!file) {
      toast.error('Pilih file Excel untuk diimpor.');
      return;
    }
    if (!user) {
      toast.error('Silakan login untuk mengimpor siswa.');
      return;
    }

    const toastId = toast.loading('Mengimpor data...');
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array((e.target as FileReader).result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        // 1. Ambil data siswa saat ini untuk memeriksa keberadaan (Mencegah Duplikat / Mengaktifkan Pembaruan)
        const q = query(studentsCollectionRef, where('userId', '==', user?.uid));
        const snapshot = await getDocs(q);
        const existingStudents: StudentRecord[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentRecord));

        const promises = json.map(async (row: Record<string, unknown>) => {
          // Periksa kolom yang wajib diisi
          if (!row['Nama Siswa']) return null;

          const rowNis = row['NIS'] ? String(row['NIS']).trim() : '';
          const rowNisn = row['NISN'] ? String(row['NISN']).trim() : '';
          const rowCode = row['Kode Siswa'] ? String(row['Kode Siswa']).trim() : '';

          // Cari siswa yang ada berdasarkan NISN (Utama), NIS (Kedua), atau Kode (Ketiga)
          // PRIORITASKAN PENCOCOKAN ID UNIK
          let existingMatch = null;
          if (rowNisn) existingMatch = existingStudents.find(s => String(s.nisn).trim() === rowNisn);
          if (!existingMatch && rowNis) existingMatch = existingStudents.find(s => String(s.nis).trim() === rowNis);
          if (!existingMatch && rowCode) existingMatch = existingStudents.find(s => String(s.code).trim() === rowCode);

          const rowRombel = row['Rombel'];
          const classObj = classes.find(c => c.rombel === rowRombel);
          const finalGender = normalizeGender(row['Jenis Kelamin']); // Gunakan penormal pintar

          const studentData = {
            code: rowCode,
            absen: row['No. Absen'],
            nis: rowNis,
            nisn: rowNisn,
            name: row['Nama Siswa'],
            gender: finalGender,
            birthPlace: row['Tempat Lahir'],
            birthDate: normalizeImportDate(row['Tanggal Lahir']),
            classId: classObj?.id || '',
            rombel: rowRombel,
            userId: user?.uid || '',
          };

          if (existingMatch) {
            // PERBARUI DATA YANG SUDAH ADA (Pertahankan ID, Perbarui Data)
            const docRef = doc(db, 'students', existingMatch.id);
            return updateDoc(docRef, studentData);
          } else {
            // BUAT BARU (ID Baru)
            return addDoc(studentsCollectionRef, studentData);
          }
        });

        await Promise.all(promises);
        toast.success(`${promises.length} siswa berhasil diimpor.`, { id: toastId });
        setFile(null);
        getStudents();
      } catch (error) {
        console.error("Error importing students: ", error);
        toast.error('Gagal mengimpor data.', { id: toastId });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    // Unduh file template statis dari folder public
    const link = document.createElement('a');
    link.href = '/template_data_siswa.xlsx';
    link.download = 'template_data_siswa.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Periksa apakah tanggal valid
      if (isNaN(date.getTime())) {
        return dateString; // Kembalikan string asli jika tanggal valid tidak dapat dibuat
      }
      return formatDate(date, 'id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-gray-800/40 p-6 rounded-3xl shadow-xl">
        <div>
          <h3 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">Manajemen Database Siswa</h3>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark font-bold mt-0.5">Kelola daftar nama, kelas, impor/ekspor data, dan proses kenaikan kelas.</p>
        </div>
        <StyledButton 
          onClick={() => setIsPromoteModalOpen(true)} 
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold shadow-lg shadow-amber-200 dark:shadow-none border-none active:scale-95"
        >
          <Scale size={16} className="mr-2" />
          Kenaikan Kelas (Promosi)
        </StyledButton>
      </div>

      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-gray-800/40 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-500">
            <Plus size={20} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Tambah Data Siswa Baru</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <StyledInput
              type="text"
              label="Kode Siswa"
              placeholder="Contoh: S001"
              value={newStudentCode}
              onChange={(e) => setNewStudentCode(e.target.value)}
            />
            {lastUsedCode && (
              <p className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-widest ml-1 animate-pulse">
                Saran: Kode terakhir adalah &quot;{lastUsedCode}&quot;
              </p>
            )}
          </div>

          <StyledSelect
            label="Rombel (Kelas)"
            value={newClassId}
            onChange={(e) => setNewClassId(e.target.value)}
          >
            <option value="">Pilih Rombel (Kelas)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.rombel}</option>
            ))}
          </StyledSelect>

          <StyledInput
            type="number"
            label="No. Absen"
            placeholder="Otomatis terisi"
            value={newAbsen}
            className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/50 font-bold text-purple-700 dark:text-purple-300"
            onChange={(e) => setNewAbsen(e.target.value)}
          />

          <div className="lg:col-span-2">
            <StyledInput type="text" label="Nama Lengkap Siswa" placeholder="Nama lengkap sesuai ijazah" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
          </div>

          <StyledSelect label="Jenis Kelamin" value={newGender} onChange={(e) => setNewGender(e.target.value)}>
            <option value="">Pilih Jenis Kelamin</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </StyledSelect>

          <StyledInput type="text" label="NIS (Opsional)" placeholder="Nomor Induk Siswa" value={newNIS} onChange={(e) => setNewNIS(e.target.value)} />
          <StyledInput type="text" label="NISN (Opsional)" placeholder="Nomor Induk Siswa Nasional" value={newNISN} onChange={(e) => setNewNISN(e.target.value)} />

          <StyledInput type="text" label="Tempat Lahir" placeholder="Kota/Kabupaten" value={newBirthPlace} onChange={(e) => setNewBirthPlace(e.target.value)} />
          <StyledInput type="date" label="Tanggal Lahir" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} />
        </div>

        <div className="mt-8 flex justify-end">
          <StyledButton onClick={addStudent} className="px-8 py-3 rounded-2xl shadow-lg shadow-purple-200 dark:shadow-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Plus className="mr-2" size={18} />
            Simpan Data Siswa
          </StyledButton>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-gray-800/40 p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Upload size={20} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Impor/Ekspor Data Pasif</h3>
        </div>
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full">
            <StyledInput type="file" label="Pilih File Excel" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </div>
          <div className="flex flex-wrap gap-3">
            <StyledButton onClick={importStudents} variant="secondary" className="px-6 rounded-xl">
              <Upload className="mr-2" size={16} />Impor Data
            </StyledButton>
            <StyledButton onClick={downloadTemplate} variant="outline" className="px-6 rounded-xl">
              <Download className="mr-2" size={16} />Unduh Template
            </StyledButton>
          </div>
        </div>
      </div>



      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Daftar Siswa</h3>
        <div className="mb-4">
          <StyledSelect
            id="rombelFilter"
            value={selectedRombelFilter}
            onChange={(e) => setSelectedRombelFilter(e.target.value)}
            className="w-full md:w-1/3"
          >
            <option value="">Semua Rombel</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.rombel}</option>
            ))}
          </StyledSelect>
        </div>
        {filteredStudents.length === 0 ? (
          <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-gray-800/40 p-12 rounded-3xl text-center">
            <p className="text-text-muted-light dark:text-text-muted-dark font-medium italic">Tidak ada data siswa yang tersedia untuk rombel ini.</p>
          </div>
        ) : (
          <div className="h-[650px] overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-gray-800/40 rounded-3xl shadow-xl overflow-hidden">
            <StyledTable headers={['Abs', 'Kode', 'NIS/N', 'Nama Siswa', 'Tgl. Lahir', 'Kelas', 'Aksi']}>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors duration-300 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-purple-600 dark:text-purple-400">
                    {String(student.absen).padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-light dark:text-text-dark tracking-tight">
                    {student.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted-light dark:text-text-muted-dark leading-tight">
                    <p>{student.nis || '-'}</p>
                    <p className="opacity-50">{student.nisn || '-'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-light dark:text-text-dark group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted-light dark:text-text-muted-dark font-medium italic opacity-70">
                    {`${student.birthPlace}, ${formatDisplayDate(student.birthDate)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                      {student.rombel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <StyledButton onClick={() => handleEditStudent(student)} variant="primary" size="sm" className="bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white border-transparent shadow-none"><Edit size={16} /></StyledButton>
                      <StyledButton onClick={() => deleteStudent(student.id)} variant="danger" size="sm" className="bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border-transparent shadow-none"><Trash2 size={16} /></StyledButton>
                    </div>
                  </td>
                </tr>
              ))}
            </StyledTable>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal onClose={handleCloseModal}>
          <StudentEditor
            studentData={selectedStudent!}
            onSave={handleSaveStudent}
            onClose={handleCloseModal}
            classes={classes}
          />
        </Modal>
      )}

      {confirmModal.isOpen && (
        <Modal onClose={() => setConfirmModal((prev: ConfirmModalState) => ({ ...prev, isOpen: false }))}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal((prev: ConfirmModalState) => ({ ...prev, isOpen: false }))}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => confirmModal.onConfirm?.()}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isPromoteModalOpen && (
        <Modal onClose={handleClosePromoteModal}>
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                <strong>Panduan Kenaikan Kelas:</strong> Pilih rombel asal dan rombel tujuan. Semua siswa di rombel asal akan dicentang secara default. Hapus centang pada siswa yang <strong>TIDAK</strong> naik kelas, lalu tekan tombol proses di bawah.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StyledSelect
                label="Rombel Asal (Kelas Lama)"
                value={sourceClassId}
                onChange={(e) => setSourceClassId(e.target.value)}
              >
                <option value="">Pilih Rombel Asal</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.rombel}</option>
                ))}
              </StyledSelect>

              <StyledSelect
                label="Rombel Tujuan (Kelas Baru)"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
              >
                <option value="">Pilih Rombel Tujuan</option>
                <option value="alumni">Lulus / Alumni (Keluarkan dari Kelas Aktif)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.rombel}</option>
                ))}
              </StyledSelect>
            </div>

            {/* Daftar siswa dengan kotak centang */}
            {sourceClassId && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Daftar Siswa ({promoteClassStudents.length})
                  </label>
                  {promoteClassStudents.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllPromote}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {selectedPromoteStudents.length === promoteClassStudents.length ? 'Kosongkan Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>

                {promoteClassStudents.length === 0 ? (
                  <div className="p-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-600 italic">Tidak ada siswa aktif di rombel ini.</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {promoteClassStudents.map((student) => {
                        const isChecked = selectedPromoteStudents.includes(student.id);
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => handleToggleStudentPromote(student.id)}
                            className="flex items-center gap-3 p-3 hover:bg-purple-50/30 dark:hover:bg-purple-900/5 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                {student.name}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                                Absen {student.absen || '-'} | NISN {student.nisn || '-'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/50">
              <StyledButton 
                variant="outline" 
                onClick={handleClosePromoteModal}
                className="px-5 rounded-xl font-bold"
              >
                Batal
              </StyledButton>
              <StyledButton
                onClick={handlePromoteStudents}
                disabled={selectedPromoteStudents.length === 0}
                className="px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold shadow-lg shadow-amber-200 dark:shadow-none border-none disabled:opacity-50"
              >
                <Scale className="mr-2" size={16} />
                Proses Kenaikan ({selectedPromoteStudents.length} Siswa)
              </StyledButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

