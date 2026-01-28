import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import StyledInput from '../components/StyledInput';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import StyledTable from '../components/StyledTable';
import RiwayatNilai from '../components/RiwayatNilai'; // Import komponen baru
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../utils/SettingsContext';

const TabButton = ({ label, isActive, onClick }) => (
  <button
    className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out focus:outline-none ${isActive
      ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-900/60'
      }`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default function NilaiPage() {
  const [activeTab, setActiveTab] = useState('input'); // 'input' or 'history'

  // States for Input & Edit
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');
  const [showEditMode, setShowEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editSelectedClass, setEditSelectedClass] = useState('');
  const [editSelectedSubject, setEditSelectedSubject] = useState('');
  const [editAssessmentType, setEditAssessmentType] = useState('');
  const [editSelectedMaterial, setEditSelectedMaterial] = useState('');
  const [materialsForEdit, setMaterialsForEdit] = useState([]);
  const [editStudents, setEditStudents] = useState([]);
  const [editGrades, setEditGrades] = useState({});
  const [isFetchingEditData, setIsFetchingEditData] = useState(false);

  const assessmentTypes = ["Harian", "Ulangan", "Tengah Semester", "Akhir Semester", "Praktik"];

  const classesCollectionRef = collection(db, 'classes');
  const subjectsCollectionRef = collection(db, 'subjects');
  const studentsCollectionRef = collection(db, 'students');
  const gradesCollectionRef = collection(db, 'grades');

  const [searchParams] = useSearchParams();
  const classIdFromUrl = searchParams.get('classId');
  const subjectIdFromUrl = searchParams.get('subjectId');
  const { activeSemester, academicYear } = useSettings();

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setCurrentDate(`${yyyy}-${mm}-${dd}`);
    setEditDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }
      try {
        const classesQuery = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid), orderBy('rombel', 'asc'));
        const classesData = await getDocs(classesQuery);
        const fetchedClasses = classesData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(fetchedClasses);

        const subjectsQuery = query(subjectsCollectionRef, where('userId', '==', auth.currentUser.uid), orderBy('name', 'asc'));
        const subjectsData = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubjects(fetchedSubjects);

        // Pre-select class and subject if provided in URL
        if (classIdFromUrl) {
          const preselectedClass = fetchedClasses.find(cls => cls.rombel === classIdFromUrl || cls.id === classIdFromUrl);
          if (preselectedClass) {
            setSelectedClass(preselectedClass.id);
            setEditSelectedClass(preselectedClass.id);
          }
        }
        if (subjectIdFromUrl) {
          const preselectedSubject = fetchedSubjects.find(sub => sub.name === subjectIdFromUrl || sub.id === subjectIdFromUrl);
          if (preselectedSubject) {
            setSelectedSubject(preselectedSubject.id);
            setEditSelectedSubject(preselectedSubject.id);
          }
        }

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
        setStudents([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [classIdFromUrl, subjectIdFromUrl]);

  const fetchStudents = useCallback(async () => {
    if (!selectedClass || !auth.currentUser) {
      setStudents([]);
      setGrades({});
      return;
    }
    setIsLoading(true);
    try {
      const classObj = classes.find(c => c.id === selectedClass);

      let studentsQuery = query(
        studentsCollectionRef,
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', selectedClass),
        orderBy('name', 'asc')
      );
      let studentsData = await getDocs(studentsQuery);

      // Fallback for legacy students (using rombel name)
      if (studentsData.empty && classObj) {
        studentsQuery = query(
          studentsCollectionRef,
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classObj.rombel),
          orderBy('name', 'asc')
        );
        studentsData = await getDocs(studentsQuery);
      }

      const fetchedStudents = studentsData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(fetchedStudents);
      const initialGrades = {};
      fetchedStudents.forEach(student => {
        initialGrades[student.id] = 0;
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error("Error fetching students: ", error);
      toast.error('Gagal memuat data siswa.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (activeTab === 'input' && !showEditMode) {
      fetchStudents();
    }
  }, [fetchStudents, showEditMode, activeTab]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!editSelectedClass || !editSelectedSubject || !editAssessmentType || !editDate || !auth.currentUser) {
        setMaterialsForEdit([]);
        setEditSelectedMaterial('');
        return;
      }
      try {
        const classObj = classes.find(c => c.id === editSelectedClass);
        const subjectObj = subjects.find(s => s.id === editSelectedSubject);

        let q = query(
          gradesCollectionRef,
          where('userId', '==', auth.currentUser.uid),
          where('classId', '==', editSelectedClass),
          where('subjectId', '==', editSelectedSubject),
          where('assessmentType', '==', editAssessmentType),
          where('date', '==', editDate),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        let querySnapshot = await getDocs(q);

        // Fallback for legacy grades (using names)
        if (querySnapshot.empty && classObj && subjectObj) {
          q = query(
            gradesCollectionRef,
            where('userId', '==', auth.currentUser.uid),
            where('className', '==', classObj.rombel),
            where('subjectName', '==', subjectObj.name),
            where('assessmentType', '==', editAssessmentType),
            where('date', '==', editDate),
            where('semester', '==', activeSemester),
            where('academicYear', '==', academicYear)
          );
          querySnapshot = await getDocs(q);
        }

        const uniqueMaterials = [...new Set(querySnapshot.docs.map(doc => doc.data().material))];
        setMaterialsForEdit(uniqueMaterials);
        if (uniqueMaterials.length > 0 && !uniqueMaterials.includes(editSelectedMaterial)) {
          setEditSelectedMaterial('');
        }
      } catch (error) {
        console.error("Error fetching materials for edit: ", error);
        toast.error('Gagal memuat daftar materi.');
      }
    };
    if (activeTab === 'input' && showEditMode) {
      fetchMaterials();
    }
  }, [editDate, editSelectedClass, editSelectedSubject, editAssessmentType, auth.currentUser, showEditMode, editSelectedMaterial, activeTab, activeSemester, academicYear]);

  const fetchEditGrades = useCallback(async () => {
    if (!editDate || !editSelectedClass || !editSelectedSubject || !editAssessmentType || !editSelectedMaterial || !auth.currentUser) {
      setEditStudents([]);
      setEditGrades({});
      return;
    }
    setIsFetchingEditData(true);
    try {
      const classObj = classes.find(c => c.id === editSelectedClass);
      const subjectObj = subjects.find(s => s.id === editSelectedSubject);

      let q = query(
        gradesCollectionRef,
        where('userId', '==', auth.currentUser.uid),
        where('date', '==', editDate),
        where('classId', '==', editSelectedClass),
        where('subjectId', '==', editSelectedSubject),
        where('assessmentType', '==', editAssessmentType),
        where('material', '==', editSelectedMaterial),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      let querySnapshot = await getDocs(q);

      // Fallback for legacy grades (using names)
      if (querySnapshot.empty && classObj && subjectObj) {
        q = query(
          gradesCollectionRef,
          where('userId', '==', auth.currentUser.uid),
          where('date', '==', editDate),
          where('className', '==', classObj.rombel),
          where('subjectName', '==', subjectObj.name),
          where('assessmentType', '==', editAssessmentType),
          where('material', '==', editSelectedMaterial),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        toast.error('Belum ada nilai untuk materi ini.');
        setEditStudents([]);
        setEditGrades({});
        return;
      }
      const fetchedGradesData = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        fetchedGradesData[data.studentId] = data.score;
      });

      let allStudentsInClassQuery = query(
        studentsCollectionRef,
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', editSelectedClass),
        orderBy('name', 'asc')
      );
      let allStudentsInClassSnapshot = await getDocs(allStudentsInClassQuery);

      // Fallback for legacy students in class
      if (allStudentsInClassSnapshot.empty && classObj) {
        allStudentsInClassQuery = query(
          studentsCollectionRef,
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classObj.rombel),
          orderBy('name', 'asc')
        );
        allStudentsInClassSnapshot = await getDocs(allStudentsInClassQuery);
      }

      const allStudentsInClass = allStudentsInClassSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const finalStudents = allStudentsInClass.map(student => ({
        ...student,
        score: fetchedGradesData[student.id] !== undefined ? fetchedGradesData[student.id] : 0
      }));
      setEditStudents(finalStudents);
      setEditGrades(fetchedGradesData);
    } catch (error) {
      console.error("Error fetching grades for edit: ", error);
      toast.error('Gagal memuat nilai untuk diedit.');
    } finally {
      setIsFetchingEditData(false);
    }
  }, [editDate, editSelectedClass, editSelectedSubject, editAssessmentType, editSelectedMaterial, activeSemester, academicYear]);

  useEffect(() => {
    if (activeTab === 'input' && showEditMode) {
      fetchEditGrades();
    }
  }, [fetchEditGrades, showEditMode, activeTab]);

  const handleGradeChange = (studentId, score) => {
    setGrades(prevGrades => ({
      ...prevGrades,
      [studentId]: score,
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedClass || !selectedSubject || !material || !assessmentType) {
      toast.error('Harap lengkapi semua informasi penilaian.');
      return;
    }
    if (Object.keys(grades).length === 0) {
      toast.error('Tidak ada siswa untuk disimpan nilainya.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Anda harus login untuk menyimpan nilai.');
      return;
    }
    const batch = writeBatch(db);
    const classId = selectedClass;
    const subjectId = selectedSubject;
    const classData = classes.find(cls => cls.id === classId);
    const subjectData = subjects.find(sub => sub.id === subjectId);
    if (!classData || !subjectData) {
      toast.error('Kelas atau Mata Pelajaran tidak ditemukan.');
      return;
    }
    const sanitizedMaterial = material.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const sanitizedAssessmentType = assessmentType.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    for (const studentId in grades) {
      const score = grades[studentId];
      if (score !== '') {
        const uniqueGradeId = `${studentId}-${classId}-${subjectId}-${currentDate}-${sanitizedMaterial}-${sanitizedAssessmentType}`;
        const gradeRef = doc(db, 'grades', uniqueGradeId);
        batch.set(gradeRef, {
          classId: classId,
          className: classData.rombel,
          subjectId: subjectId,
          subjectName: subjectData.name,
          studentId: studentId,
          studentName: students.find(s => s.id === studentId)?.name || '',
          date: currentDate,
          material: material,
          assessmentType: assessmentType,
          score: parseFloat(score),
          userId: auth.currentUser.uid,
          semester: activeSemester,
          academicYear: academicYear,
          timestamp: new Date(),
        }, { merge: true });
      }
    }
    if (batch._mutations.length === 0) {
      toast.error('Tidak ada nilai yang dimasukkan untuk disimpan.');
      return;
    }
    const promise = batch.commit();
    toast.promise(promise, {
      loading: 'Menyimpan nilai...',
      success: () => {
        setSelectedClass('');
        setSelectedSubject('');
        setMaterial('');
        setAssessmentType('');
        setGrades({});
        setStudents([]);
        return 'Nilai berhasil disimpan!';
      },
      error: 'Gagal menyimpan nilai. Silakan coba lagi.',
    });
  };

  const handleSaveEditedGrades = async () => {
    if (!editSelectedClass || !editSelectedSubject || !editSelectedMaterial || !editAssessmentType || !editDate) {
      toast.error('Harap lengkapi semua informasi penilaian.');
      return;
    }
    if (Object.keys(editGrades).length === 0) {
      toast.error('Tidak ada siswa untuk disimpan nilainya.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Anda harus login untuk menyimpan nilai.');
      return;
    }
    const batch = writeBatch(db);
    const classId = editSelectedClass;
    const subjectId = editSelectedSubject;
    const classData = classes.find(cls => cls.id === classId);
    const subjectData = subjects.find(sub => sub.id === subjectId);
    if (!classData || !subjectData) {
      toast.error('Kelas atau Mata Pelajaran tidak ditemukan.');
      return;
    }
    const sanitizedMaterial = editSelectedMaterial.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const sanitizedAssessmentType = editAssessmentType.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    for (const student of editStudents) {
      const score = editGrades[student.id];
      if (score !== undefined && score !== '') {
        const uniqueGradeId = `${student.id}-${classId}-${subjectId}-${editDate}-${sanitizedMaterial}-${sanitizedAssessmentType}`;
        const gradeRef = doc(db, 'grades', uniqueGradeId);
        batch.set(gradeRef, {
          classId: classId,
          className: classData.rombel,
          subjectId: subjectId,
          subjectName: subjectData.name,
          studentId: student.id,
          studentName: student.name,
          date: editDate,
          material: editSelectedMaterial,
          assessmentType: editAssessmentType,
          score: parseFloat(score),
          userId: auth.currentUser.uid,
          semester: activeSemester,
          academicYear: academicYear,
          timestamp: new Date(),
        }, { merge: true });
      }
    }
    if (batch._mutations.length === 0) {
      toast.error('Tidak ada perubahan nilai yang dimasukkan untuk disimpan.');
      return;
    }
    const promise = batch.commit();
    toast.promise(promise, {
      loading: 'Menyimpan perubahan nilai...',
      success: () => {
        setEditDate('');
        setEditSelectedClass('');
        setEditSelectedSubject('');
        setEditAssessmentType('');
        setEditSelectedMaterial('');
        setMaterialsForEdit([]);
        setEditStudents([]);
        setEditGrades({});
        return 'Perubahan nilai berhasil disimpan!';
      },
      error: 'Gagal menyimpan perubahan nilai. Silakan coba lagi.',
    });
  };

  const handleToggleMode = () => {
    setShowEditMode(prev => !prev);
    setSelectedClass('');
    setSelectedSubject('');
    setMaterial('');
    setAssessmentType('');
    setGrades({});
    setStudents([]);
    setEditDate('');
    setEditSelectedClass('');
    setEditSelectedSubject('');
    setEditAssessmentType('');
    setEditSelectedMaterial('');
    setMaterialsForEdit([]);
    setEditStudents([]);
    setEditGrades({});
  };

  if (isLoading && students.length === 0 && editStudents.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Manajemen Nilai</h1>

      {/* Tab Navigator */}
      <div className="max-w-md mx-auto sm:mx-0 mb-6">
        <div className="flex space-x-1 p-1 bg-gray-200 dark:bg-gray-900 rounded-xl">
          <TabButton label="Input & Edit" isActive={activeTab === 'input'} onClick={() => setActiveTab('input')} />
          <TabButton label="Riwayat Nilai" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'input' && (
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
              {showEditMode ? 'Edit Nilai' : 'Input Nilai'}
            </h2>
            <button
              onClick={handleToggleMode}
              className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              {showEditMode ? 'Kembali ke Input Nilai' : 'Edit Nilai'}
            </button>
          </div>

          {!showEditMode ? (
            // Input Nilai Form
            <>
              <div className="space-y-4 mb-6">
                <StyledInput type="date" label="Tanggal Penilaian" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
                <StyledSelect label="Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                  <option value="">Pilih Kelas</option>
                  {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.rombel}</option>)}
                </StyledSelect>
                <StyledSelect label="Mata Pelajaran" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">Pilih Mata Pelajaran</option>
                  {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </StyledSelect>
                <StyledInput type="text" label="Materi" placeholder="Contoh: Bab 1 - Pengenalan Aljabar" value={material} onChange={(e) => setMaterial(e.target.value)} voiceEnabled />
                <StyledSelect label="Jenis Penilaian" value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
                  <option value="">Pilih Jenis Penilaian</option>
                  {assessmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </StyledSelect>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Daftar Siswa dan Nilai</h3>
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <StyledTable headers={[{ label: 'No.', className: 'w-12 sm:w-16' }, { label: 'Nama Siswa', className: 'w-auto' }, { label: 'Nilai', className: 'w-24 sm:w-32' }]}>
                    {students.map((student, index) => (
                      <tr key={student.id}>
                        <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm font-medium text-text-light dark:text-text-dark">{index + 1}</td>
                        <td className="px-3 py-4 text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">{student.name}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                          <StyledInput type="number" value={grades[student.id]} onChange={(e) => handleGradeChange(student.id, e.target.value)} className="!px-2.5" containerClassName="w-full" min="0" max="100" />
                        </td>
                      </tr>
                    ))}
                  </StyledTable>
                </div>
              ) : (
                <p className="text-text-muted-light dark:text-text-muted-dark">Pilih kelas untuk menampilkan daftar siswa.</p>
              )}
              <div className="mt-6 flex justify-end">
                <StyledButton onClick={handleSaveGrades}>Simpan Nilai</StyledButton>
              </div>
            </>
          ) : (
            // Edit Nilai Form
            <div className="space-y-4 mb-6">
              <StyledInput type="date" label="Tanggal Penilaian" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              <StyledSelect label="Kelas" value={editSelectedClass} onChange={(e) => setEditSelectedClass(e.target.value)}>
                <option value="">Pilih Kelas</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.rombel}</option>)}
              </StyledSelect>
              <StyledSelect label="Mata Pelajaran" value={editSelectedSubject} onChange={(e) => setEditSelectedSubject(e.target.value)}>
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </StyledSelect>
              <StyledSelect label="Jenis Penilaian" value={editAssessmentType} onChange={(e) => setEditAssessmentType(e.target.value)}>
                <option value="">Pilih Jenis Penilaian</option>
                {assessmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </StyledSelect>
              <StyledSelect label="Materi" value={editSelectedMaterial} onChange={(e) => setEditSelectedMaterial(e.target.value)} disabled={materialsForEdit.length === 0}>
                <option value="">Pilih Materi</option>
                {materialsForEdit.map(mat => <option key={mat} value={mat}>{mat}</option>)}
              </StyledSelect>
              {isFetchingEditData ? (
                <div className="text-center text-text-muted-light dark:text-text-muted-dark">Memuat data nilai...</div>
              ) : editStudents.length > 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Daftar Siswa dan Nilai</h3>
                  <div className="overflow-x-auto">
                    <StyledTable headers={[{ label: 'No.', className: 'w-12 sm:w-16' }, { label: 'Nama Siswa', className: 'w-auto' }, { label: 'Nilai', className: 'w-24 sm:w-32' }]}>
                      {editStudents.map((student, index) => (
                        <tr key={student.id}>
                          <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm font-medium text-text-light dark:text-text-dark">{index + 1}</td>
                          <td className="px-3 py-4 text-xs sm:px-6 sm:text-sm text-text-muted-light dark:text-text-muted-dark">{student.name}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-xs sm:px-6 sm:text-sm">
                            <StyledInput type="number" value={editGrades[student.id]} onChange={(e) => setEditGrades(prev => ({ ...prev, [student.id]: e.target.value }))} className="!px-2.5" containerClassName="w-full" min="0" max="100" />
                          </td>
                        </tr>
                      ))}
                    </StyledTable>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <StyledButton onClick={handleSaveEditedGrades}>Simpan Perubahan</StyledButton>
                  </div>
                </>
              ) : (
                <p className="text-text-muted-light dark:text-text-muted-dark">Pilih kriteria di atas untuk menampilkan nilai.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <RiwayatNilai classes={classes} subjects={subjects} />
      )}
    </div>
  );
}
