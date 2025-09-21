import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase'; // Import auth
import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import { Plus, Upload, Download, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubjectMasterData() {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState(null); // State for editing
  const [editedSubjectCode, setEditedSubjectCode] = useState('');
  const [editedSubjectName, setEditedSubjectName] = useState('');
  const [file, setFile] = useState(null);

  const subjectsCollectionRef = collection(db, 'subjects');

  useEffect(() => {
    const getSubjects = async () => {
      if (auth.currentUser) {
        const q = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
        const data = await getDocs(q);
        setSubjects(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      }
    };
    // Listen for auth state changes to fetch data when user logs in
    const unsubscribe = auth.onAuthStateChanged(() => {
      getSubjects();
    });
    return () => unsubscribe();
  }, []);

  const saveSubject = async () => {
    if (!auth.currentUser) {
      toast.error('Please log in to manage subjects.');
      return;
    }

    if (editingSubjectId) { // Update existing subject
      if (editedSubjectCode && editedSubjectName) {
        const subjectDoc = doc(db, 'subjects', editingSubjectId);
        await updateDoc(subjectDoc, { code: editedSubjectCode, name: editedSubjectName });
        toast.success('Mata pelajaran berhasil diperbarui!');
        setEditingSubjectId(null);
        setEditedSubjectCode('');
        setEditedSubjectName('');
      } else {
        toast.error('Please enter both subject code and name.');
      }
    } else { // Add new subject
      if (newSubjectCode && newSubjectName) {
        await addDoc(subjectsCollectionRef, { code: newSubjectCode, name: newSubjectName, userId: auth.currentUser.uid });
        toast.success('Mata pelajaran berhasil ditambahkan!');
        setNewSubjectCode('');
        setNewSubjectName('');
      } else {
        toast.error('Please enter both subject code and name.');
      }
    }
    // Re-fetch subjects after saving
    const q = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
    const data = await getDocs(q);
    setSubjects(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  };

  const deleteSubject = (id) => {
    if (!auth.currentUser) {
      toast.error('Please log in to delete subjects.');
      return;
    }

    const deleteToast = toast.loading(
      (t) => (
        <div className="flex flex-col items-center gap-2">
          <p>Apakah Anda yakin ingin menghapus mata pelajaran ini?</p>
          <div className="flex gap-2">
            <StyledButton
              variant="danger"
              size="sm"
              onClick={() => {
                performDelete(id);
                toast.dismiss(deleteToast);
              }}
            >
              Ya, Hapus
            </StyledButton>
            <StyledButton
              variant="secondary"
              size="sm"
              onClick={() => toast.dismiss(deleteToast)}
            >
              Batal
            </StyledButton>
          </div>
        </div>
      ),
      { duration: Infinity } // Keep the toast open until dismissed
    );
  };

  const performDelete = async (id) => {
    try {
      const subjectDoc = doc(db, 'subjects', id);
      await deleteDoc(subjectDoc);
      toast.success('Mata pelajaran berhasil dihapus!');
      // Re-fetch subjects after deleting
      const q = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
      const data = await getDocs(q);
      setSubjects(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      toast.error('Gagal menghapus mata pelajaran.');
      console.error("Error deleting document: ", error);
    }
  };

  const startEditing = (subject) => {
    setEditingSubjectId(subject.id);
    setEditedSubjectCode(subject.code);
    setEditedSubjectName(subject.name);
  };

  const cancelEditing = () => {
    setEditingSubjectId(null);
    setEditedSubjectCode('');
    setEditedSubjectName('');
  };

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
  };

  const importSubjects = async () => {
    if (file && auth.currentUser) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        for (const row of json) {
          if (row['Kode Mata Pelajaran'] && row['Nama Mata Pelajaran']) {
            await addDoc(subjectsCollectionRef, { code: row['Kode Mata Pelajaran'], name: row['Nama Mata Pelajaran'], userId: auth.currentUser.uid });
          }
        }
        toast.success('Data imported successfully!');
        setFile(null);
        // Re-fetch subjects after importing
        const q = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid));
        const updatedData = await getDocs(q);
        setSubjects(updatedData.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      };
      reader.readAsArrayBuffer(file);
    } else if (!auth.currentUser) {
      toast.error('Please log in to import subjects.');
    } else {
      toast.error('Please select an Excel file to import.');
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Kode Mata Pelajaran': '', 'Nama Mata Pelajaran': '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mata Pelajaran');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'template_mata_pelajaran.xlsx');
  };

  const tableHeaders = ['Kode', 'Nama', 'Aksi'];

  return (
    <div className="space-y-6">
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">
          {editingSubjectId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <StyledInput
            type="text"
            placeholder="Kode Mata Pelajaran"
            value={editingSubjectId ? editedSubjectCode : newSubjectCode}
            onChange={(e) => (editingSubjectId ? setEditedSubjectCode(e.target.value) : setNewSubjectCode(e.target.value))}
          />
          <StyledInput
            type="text"
            placeholder="Nama Mata Pelajaran"
            value={editingSubjectId ? editedSubjectName : newSubjectName}
            onChange={(e) => (editingSubjectId ? setEditedSubjectName(e.target.value) : setNewSubjectName(e.target.value))}
          />
          <StyledButton onClick={saveSubject}>
            {editingSubjectId ? 'Perbarui' : 'Tambah'}
          </StyledButton>
          {editingSubjectId && (
            <StyledButton onClick={cancelEditing} variant="secondary">
              Batal
            </StyledButton>
          )}
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Impor/Ekspor Data</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <StyledInput type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <StyledButton onClick={importSubjects} variant="secondary"><Upload className="mr-2" size={16} />Impor</StyledButton>
          <StyledButton onClick={downloadTemplate} variant="outline"><Download className="mr-2" size={16} />Unduh Template</StyledButton>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Daftar Mata Pelajaran</h3>
        {subjects.length === 0 ? (
          <p className="text-text-muted-light dark:text-text-muted-dark">Tidak ada mata pelajaran yang tersedia.</p>
        ) : (
          <StyledTable headers={tableHeaders}>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">{subject.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">{subject.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <StyledButton onClick={() => startEditing(subject)} variant="primary" size="sm" className="mr-2"><Edit size={16} /></StyledButton>
                  <StyledButton onClick={() => deleteSubject(subject.id)} variant="danger" size="sm"><Trash2 size={16} /></StyledButton>
                </td>
              </tr>
            ))}
          </StyledTable>
        )}
      </div>
    </div>
  );
}
