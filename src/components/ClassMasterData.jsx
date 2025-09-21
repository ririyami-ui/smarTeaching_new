import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import ClassCard from './ClassCard';
import Modal from './Modal';
import { Plus, Upload, Download } from 'lucide-react';

export default function ClassMasterData() {
  const [classes, setClasses] = useState([]);
  // State for new class form
  const [newCode, setNewCode] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [newRombel, setNewRombel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // State for file import
  const [file, setFile] = useState(null);
  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [editData, setEditData] = useState({ code: '', level: '', rombel: '', description: '' });

  const classesCollectionRef = collection(db, 'classes');

  const getClasses = async () => {
    if (auth.currentUser) {
      try {
        const q = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid));
        const data = await getDocs(q);
        setClasses(
          data.docs
            .map((doc) => ({ ...doc.data(), id: doc.id }))
            .sort((a, b) => a.rombel.localeCompare(b.rombel))
        );
      } catch (error) {
        console.error("Error getting classes: ", error);
        toast.error('Gagal memuat data kelas. Cek konsol untuk detail.');
        // If the error is due to a missing index, Firestore provides a link to create it.
        if (error.code === 'failed-precondition') {
          toast.error('Indeks database yang diperlukan tidak ada. Silakan buat indeks di Firebase Console.', { duration: 6000 });
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) getClasses();
      else setClasses([]);
    });
    return () => unsubscribe();
  }, []);

  const addClass = async () => {
    if (!newCode || !newLevel || !newRombel) {
      toast.error('Kode Kelas, Tingkat, dan Rombel wajib diisi.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Silakan login untuk menambah kelas.');
      return;
    }

    // Check for duplicate class code
    const q = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid), where('code', '==', newCode));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      toast.error('Kode Kelas sudah ada.');
      return;
    }

    console.log("Attempting to add class with data:");
    console.log("  code:", newCode);
    console.log("  level:", newLevel);
    console.log("  rombel:", newRombel);
    console.log("  description:", newDescription);
    console.log("  userId:", auth.currentUser.uid);

    const promise = addDoc(classesCollectionRef, { 
      code: newCode,
      level: newLevel,
      rombel: newRombel,
      description: newDescription,
      userId: auth.currentUser.uid 
    });

    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: () => {
        setNewCode('');
        setNewLevel('');
        setNewRombel('');
        setNewDescription('');
        getClasses();
        return 'Kelas berhasil ditambahkan!';
      },
      error: 'Gagal menambah kelas.',
    });
  };

  const deleteClass = async (id) => {
    const promise = deleteDoc(doc(db, 'classes', id));
    toast.promise(promise, {
      loading: 'Menghapus...',
      success: () => {
        getClasses();
        return 'Kelas berhasil dihapus!';
      },
      error: 'Gagal menghapus kelas.',
    });
  };

  const handleOpenEditModal = (classItem) => {
    setCurrentClass(classItem);
    setEditData(classItem);
    setIsEditModalOpen(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!currentClass) return;

    // Check if the new code already exists in another class
    if (editData.code !== currentClass.code) {
      const q = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid), where('code', '==', editData.code));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast.error('Kode Kelas sudah ada.');
        return;
      }
    }

    const classDocRef = doc(db, 'classes', currentClass.id);
    const promise = updateDoc(classDocRef, editData);

    toast.promise(promise, {
      loading: 'Memperbarui...',
      success: () => {
        setIsEditModalOpen(false);
        getClasses();
        return 'Data kelas berhasil diperbarui!';
      },
      error: 'Gagal memperbarui data.',
    });
  };

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
  };

  const importClasses = async () => {
    if (!file) {
      toast.error('Pilih file Excel untuk diimpor.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Silakan login untuk mengimpor kelas.');
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

        // Fetch existing class codes to prevent duplicates
        const existingClassesQuery = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid));
        const existingClassesSnapshot = await getDocs(existingClassesQuery);
        const existingClassCodes = new Set(existingClassesSnapshot.docs.map(doc => doc.data().code));

        let importedCount = 0;
        let skippedCount = 0;

        const promises = json.map(row => {
          const code = row['Kode Kelas'];
          if (code && row['Tingkat'] && row['Rombel']) {
            if (existingClassCodes.has(code)) {
              skippedCount++;
              return null; // Skip duplicate
            }
            importedCount++;
            existingClassCodes.add(code); // Add to set to handle duplicates within the file itself
            return addDoc(classesCollectionRef, { 
              code: code,
              level: row['Tingkat'],
              rombel: row['Rombel'],
              description: row['Keterangan'] || '',
              userId: auth.currentUser.uid 
            });
          }
          return null;
        }).filter(p => p !== null);

        await Promise.all(promises);
        
        let message = `Impor selesai! ${importedCount} kelas berhasil ditambahkan.`;
        if (skippedCount > 0) {
          message += ` ${skippedCount} kelas dilewati karena kode sudah ada.`;
        }
        toast.success(message, { id: toastId, duration: 5000 });

        setFile(null);
        getClasses();
      } catch (error) {
        console.error("Error importing classes: ", error);
        toast.error('Gagal mengimpor data.', { id: toastId });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 
      'Kode Kelas': '', 
      'Tingkat': '', 
      'Rombel': '', 
      'Keterangan': '' 
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'template_data_kelas.xlsx');
  };

  const tableHeaders = ['Kode Kelas', 'Tingkat', 'Rombel', 'Keterangan', 'Aksi'];

  return (
    <>
      <div className="space-y-6">
        {/* Add Class Form */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Tambah Data Kelas Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StyledInput type="text" placeholder="Kode Kelas" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <StyledInput type="text" placeholder="Tingkat (e.g., X, XI)" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} />
            <StyledInput type="text" placeholder="Rombel (e.g., A, B, 1)" value={newRombel} onChange={(e) => setNewRombel(e.target.value)} />
            <StyledInput type="text" placeholder="Keterangan (Opsional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <StyledButton onClick={addClass}><Plus className="mr-2" size={16} />Tambah</StyledButton>
          </div>
        </div>

        {/* Import/Export Section */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Impor/Ekspor Data</h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <StyledInput type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <StyledButton onClick={importClasses} variant="secondary"><Upload className="mr-2" size={16} />Impor</StyledButton>
            <StyledButton onClick={downloadTemplate} variant="outline"><Download className="mr-2" size={16} />Unduh Template</StyledButton>
          </div>
        </div>

        {/* Class List Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Daftar Kelas</h3>
          {classes.length === 0 ? (
            <p className="text-text-muted-light dark:text-text-muted-dark">Tidak ada data kelas yang tersedia.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-[500px] overflow-y-auto p-2">
              {classes.map((classItem) => (
                <ClassCard 
                  key={classItem.id} 
                  classItem={classItem} 
                  onEdit={handleOpenEditModal} 
                  onDelete={deleteClass} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <Modal onClose={() => setIsEditModalOpen(false)}>
          <h3 className="text-lg font-semibold mb-4">Edit Data Kelas</h3>
          <form onSubmit={handleUpdateClass} className="space-y-4">
            <StyledInput 
              type="text" 
              placeholder="Kode Kelas" 
              value={editData.code} 
              onChange={(e) => setEditData({ ...editData, code: e.target.value })}
            />
            <StyledInput 
              type="text" 
              placeholder="Tingkat" 
              value={editData.level} 
              onChange={(e) => setEditData({ ...editData, level: e.target.value })}
            />
            <StyledInput 
              type="text" 
              placeholder="Rombel" 
              value={editData.rombel} 
              onChange={(e) => setEditData({ ...editData, rombel: e.target.value })}
            />
            <StyledInput 
              type="text" 
              placeholder="Keterangan" 
              value={editData.description} 
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-6">
              <StyledButton type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</StyledButton>
              <StyledButton type="submit">Simpan Perubahan</StyledButton>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
