import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledSelect from './StyledSelect';
import StudentCard from './StudentCard';
import { Plus, Upload, Download } from 'lucide-react';
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
  const [newRombel, setNewRombel] = useState('');
  const [newAbsen, setNewAbsen] = useState('');
  const [file, setFile] = useState(null);
  const [rombels, setRombels] = useState([]);
  const [selectedRombelFilter, setSelectedRombelFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
            const rombelList = data.docs.map((doc) => doc.data().rombel);
            const sortedRombelList = [...new Set(rombelList)].sort((a, b) => a.localeCompare(b));
            setRombels(sortedRombelList);
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
    if (!newStudentCode || !newNIS || !newNISN || !newStudentName || !newGender || !newBirthPlace || !newBirthDate || !newRombel || !newAbsen) {
      toast.error('Lengkapi semua detail siswa, termasuk no. absen.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Silakan login untuk menambah siswa.');
      return;
    }

    const promise = addDoc(studentsCollectionRef, {
      code: newStudentCode,
      nis: newNIS,
      nisn: newNISN,
      name: newStudentName,
      gender: newGender,
      birthPlace: newBirthPlace,
      birthDate: newBirthDate,
      rombel: newRombel,
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
        setNewBirthPlace('');
        setNewBirthDate('');
        setNewRombel('');
        setNewAbsen('');
        getStudents();
        return 'Siswa berhasil ditambahkan!';
      },
      error: 'Gagal menambah siswa.',
    });
  };

  const deleteStudent = async (id) => {
    const promise = deleteDoc(doc(db, 'students', id));
    toast.promise(promise, {
      loading: 'Menghapus...',
      success: () => {
        getStudents();
        return 'Siswa berhasil dihapus!';
      },
      error: 'Gagal menghapus siswa.',
    });
  };

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
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
            return addDoc(studentsCollectionRef, {
              code: row['Kode Siswa'],
              absen: row['No. Absen'],
              nis: row['NIS'],
              nisn: row['NISN'],
              name: row['Nama Siswa'],
              gender: row['Jenis Kelamin'],
              birthPlace: row['Tempat Lahir'],
              birthDate: row['Tanggal Lahir'],
              rombel: row['Rombel'],
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
    const ws = XLSX.utils.json_to_sheet([
      { 'Kode Siswa': '', 'No. Absen': '', 'NIS': '', 'NISN': '', 'Nama Siswa': '', 'Jenis Kelamin': '', 'Tempat Lahir': '', 'Tanggal Lahir': '', 'Rombel': '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'template_data_siswa.xlsx');
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
            <StyledSelect value={newRombel} onChange={(e) => setNewRombel(e.target.value)}>
              <option value="">Pilih Rombel</option>
              {rombels.map((rombel) => (
                <option key={rombel} value={rombel}>{rombel}</option>
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
            {rombels.map((rombel) => (
              <option key={rombel} value={rombel}>{rombel}</option>
            ))}
          </StyledSelect>
        </div>
        {students.length === 0 ? (
          <p className="text-text-muted-light dark:text-text-muted-dark">Tidak ada data siswa yang tersedia.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-[500px] overflow-y-auto p-2">
            {students.map((student) => (
              <StudentCard 
                key={student.id} 
                student={student} 
                onEdit={handleEditStudent} 
                onDelete={deleteStudent} 
              />
            ))}
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
          />
        </Modal>
      )}
    </div>
  );
}
