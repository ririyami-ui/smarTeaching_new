import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledSelect from './StyledSelect';
import StyledTable from './StyledTable';
import { Plus, Upload, Download, Edit, Trash2 } from 'lucide-react';
import Modal from './Modal';
import StudentEditor from './StudentEditor';

export default function StudentMasterData() {
  const [students, setStudents] = useState([]);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newNIS, setNewNIS] = useState('');
  const [newNISN, setNewNISN] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newBirthPlace, setNewBirthPlace] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newAbsen, setNewAbsen] = useState('');
  const [file, setFile] = useState(null);
  const [rombels, setRombels] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedRombelFilter, setSelectedRombelFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSaveStudent = () => {
    getStudents(); // Refresh the list after saving
    handleCloseModal();
  };

  const studentsCollectionRef = collection(db, 'students');
  const classesCollectionRef = collection(db, 'classes');

  const getStudents = useCallback(async () => {
    if (!auth.currentUser) {
      setStudents([]);
      return;
    }
    try {
      let q;
      if (selectedRombelFilter) {
        q = query(studentsCollectionRef, where('userId', '==', auth.currentUser.uid), where('rombel', '==', selectedRombelFilter), orderBy('code'));
      } else {
        q = query(studentsCollectionRef, where('userId', '==', auth.currentUser.uid), orderBy('code'));
      }
      const data = await getDocs(q);
      setStudents(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("Error getting students: ", error);
      toast.error('Gagal memuat data siswa.');
    }
  }, [selectedRombelFilter]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const getRombels = async () => {
          try {
            const q = query(classesCollectionRef, where('userId', '==', user.uid));
            const data = await getDocs(q);
            const classList = data.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.rombel.localeCompare(b.rombel));
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
  }, [getStudents]);

  useEffect(() => {
    getStudents();
  }, [getStudents]);

  const addStudent = async () => {
    if (!newStudentCode || !newNIS || !newNISN || !newStudentName || !newGender || !newBirthPlace || !newBirthDate || !newClassId || !newAbsen) {
      toast.error('Lengkapi semua detail siswa, termasuk no. absen.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Silakan login untuk menambah siswa.');
      return;
    }

    const selectedClassObj = classes.find(c => c.id === newClassId);

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
      userId: auth.currentUser.uid,
    });

    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: () => {
        setNewStudentCode('');
        setNewNIS('');
        setNewNISN('');
        setNewStudentName('');
        setNewGender('');
        setBirthPlace('');
        setNewBirthDate('');
        setNewClassId('');
        setNewAbsen('');
        getStudents();
        return 'Siswa berhasil ditambahkan!';
      },
      error: 'Gagal menambah siswa.',
    });
  };

  const deleteStudent = (id) => {
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
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            return 'Siswa berhasil dihapus!';
          },
          error: 'Gagal menghapus siswa.',
        });
      }
    });
  };

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
  };

  // Smart Date Normalizer (Excel Serial, DD/MM/YYYY, or Indonesian Text)
  const normalizeImportDate = (input) => {
    if (!input) return '';

    // 1. Handle Excel Serial (Number)
    if (typeof input === 'number') {
      const utc_days = Math.floor(input - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const year = date_info.getFullYear();
      const month = String(date_info.getMonth() + 1).padStart(2, '0');
      const day = String(date_info.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. Handle String Formats
    if (typeof input === 'string') {
      const str = input.trim();

      // Standard YYYY-MM-DD -> Return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

      // DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
      }

      // DD Month YYYY (Indonesian e.g. "20 Januari 2010" or "20 Jan 2010")
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
        const month = monthMap[monthRaw];

        if (month) return `${year}-${month}-${day}`;
      }

      // Try Javascript Date Parser as fallback
      const dateObj = new Date(str);
      if (!isNaN(dateObj)) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return input; // Return original if unknown format
  };

  const importStudents = async () => {
    if (!file) {
      toast.error('Pilih file Excel untuk diimpor.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Silakan login untuk mengimpor siswa.');
      return;
    }

    const toastId = toast.loading('Mengimpor data...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const promises = json.map(row => {
          if (row['Kode Siswa'] && row['No. Absen'] && row['NIS'] && row['NISN'] && row['Nama Siswa'] && row['Jenis Kelamin'] && row['Tempat Lahir'] && row['Tanggal Lahir'] && row['Rombel']) {
            const rowRombel = row['Rombel'];
            const classObj = classes.find(c => c.rombel === rowRombel);

            return addDoc(studentsCollectionRef, {
              code: row['Kode Siswa'],
              absen: row['No. Absen'],
              nis: row['NIS'],
              nisn: row['NISN'],
              name: row['Nama Siswa'],
              gender: row['Jenis Kelamin'],
              birthPlace: row['Tempat Lahir'],
              birthDate: normalizeImportDate(row['Tanggal Lahir']), // Use smart normalizer
              classId: classObj?.id || '',
              rombel: rowRombel,
              userId: auth.currentUser.uid,
            });
          }
          return null;
        }).filter(p => p !== null);

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
    // Download static template file from public folder
    const link = document.createElement('a');
    link.href = '/template_data_siswa.xlsx';
    link.download = 'template_data_siswa.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if valid date cannot be created
      }
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Tambah Data Siswa Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StyledInput type="text" placeholder="Kode Siswa" value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value)} />
          <StyledInput type="number" placeholder="No. Absen" value={newAbsen} onChange={(e) => setNewAbsen(e.target.value)} />
          <StyledInput type="text" placeholder="NIS" value={newNIS} onChange={(e) => setNewNIS(e.target.value)} />
          <StyledInput type="text" placeholder="NISN" value={newNISN} onChange={(e) => setNewNISN(e.target.value)} />
          <StyledInput type="text" placeholder="Nama Siswa" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
          <StyledSelect value={newGender} onChange={(e) => setNewGender(e.target.value)}>
            <option value="">Pilih Jenis Kelamin</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </StyledSelect>
          <StyledInput type="text" placeholder="Tempat Lahir" value={newBirthPlace} onChange={(e) => setNewBirthPlace(e.target.value)} />
          <StyledInput type="date" placeholder="Tanggal Lahir" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} />
          <StyledSelect value={newClassId} onChange={(e) => setNewClassId(e.target.value)}>
            <option value="">Pilih Rombel (Kelas)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.rombel}</option>
            ))}
          </StyledSelect>
        </div>
        <div className="mt-4 flex justify-end">
          <StyledButton onClick={addStudent}><Plus className="mr-2" size={16} />Tambah</StyledButton>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Impor/Ekspor Data</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <StyledInput type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <StyledButton onClick={importStudents} variant="secondary"><Upload className="mr-2" size={16} />Impor</StyledButton>
          <StyledButton onClick={downloadTemplate} variant="outline"><Download className="mr-2" size={16} />Unduh Template</StyledButton>
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
              <option key={c.id} value={c.rombel}>{c.rombel}</option>
            ))}
          </StyledSelect>
        </div>
        {students.length === 0 ? (
          <p className="text-text-muted-light dark:text-text-muted-dark">Tidak ada data siswa yang tersedia.</p>
        ) : (
          <div className="h-[600px] overflow-y-auto">
            <StyledTable headers={['Kode Siswa', 'NIS', 'NISN', 'Nama Siswa', 'Tempat Tgl. Lahir', 'Kelas', 'Aksi']}>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">{student.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">{student.nis}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">{student.nisn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">
                    {`${student.birthPlace}, ${formatDisplayDate(student.birthDate)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">{student.rombel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <StyledButton onClick={() => handleEditStudent(student)} variant="primary" size="sm" className="mr-2"><Edit size={16} /></StyledButton>
                    <StyledButton onClick={() => deleteStudent(student.id)} variant="danger" size="sm"><Trash2 size={16} /></StyledButton>
                  </td>
                </tr>
              ))}
            </StyledTable>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Edit Data Siswa" onClose={handleCloseModal}>
          <StudentEditor
            studentData={selectedStudent}
            onSave={handleSaveStudent}
            onClose={handleCloseModal}
            rombels={rombels}
            classes={classes}
          />
        </Modal>
      )}

      {confirmModal.isOpen && (
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
      )}
    </div>
  );
}