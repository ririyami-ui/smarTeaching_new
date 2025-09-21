import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';

const PelanggaranPage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [infractionType, setInfractionType] = useState('');
  const [infractions, setInfractions] = useState([]);
  const [studentScore, setStudentScore] = useState(100);
  const [attitude, setAttitude] = useState('Sangat Baik');
  const [customInfraction, setCustomInfraction] = useState('');
  const [customPoints, setCustomPoints] = useState('');

  const infractionTypes = {
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
    'Lainnya': { points: 0, sanction: 'Dicatat sesuai kebijakan' },
  };

  useEffect(() => {
    const fetchClasses = async () => {
      if (auth.currentUser) {
        const q = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid), orderBy('rombel', 'asc'));
        const querySnapshot = await getDocs(q);
        setClasses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedClass) {
        const q = query(collection(db, 'students'), where('userId', '==', auth.currentUser.uid), where('rombel', '==', selectedClass), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        setStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  const handleSaveInfraction = async () => {
    if (!selectedStudent || !infractionType) {
      toast.error('Silakan pilih siswa dan jenis pelanggaran.');
      return;
    }

    let infractionData = {};

    if (infractionType === 'Lainnya') {
      if (!customInfraction || !customPoints) {
        toast.error('Untuk pelanggaran "Lainnya", detail dan poin harus diisi.');
        return;
      }
      infractionData = {
        userId: auth.currentUser.uid,
        studentId: selectedStudent,
        classId: selectedClass,
        date: new Date().toISOString(),
        infractionType: customInfraction, // Use custom infraction type
        points: parseInt(customPoints, 10), // Use custom points
        sanction: 'Dicatat sesuai kebijakan', // Or a custom sanction input
      };
    } else {
      infractionData = {
        userId: auth.currentUser.uid,
        studentId: selectedStudent,
        classId: selectedClass,
        date: new Date().toISOString(),
        infractionType,
        points: infractionTypes[infractionType].points,
        sanction: infractionTypes[infractionType].sanction,
      };
    }

    try {
      await addDoc(collection(db, 'infractions'), infractionData);
      toast.success('Pelanggaran berhasil dicatat.');
      // Refresh data
      fetchInfractions(selectedStudent);
      // Reset custom fields
      setCustomInfraction('');
      setCustomPoints('');
      setInfractionType('');
    } catch (error) {
      toast.error('Gagal menyimpan data.');
      console.error("Error adding document: ", error);
    }
  };

  const handleDeleteInfraction = async (infractionId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pelanggaran ini?')) {
      try {
        await deleteDoc(doc(db, 'infractions', infractionId));
        toast.success('Pelanggaran berhasil dihapus.');
        // Refresh data
        fetchInfractions(selectedStudent);
      } catch (error) {
        toast.error('Gagal menghapus pelanggaran.');
        console.error("Error removing document: ", error);
      } 
    }
  };

  const fetchInfractions = async (studentId) => {
    if (studentId) {
      const q = query(collection(db, 'infractions'), where('userId', '==', auth.currentUser.uid), where('studentId', '==', studentId), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedInfractions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInfractions(fetchedInfractions);
      calculateScore(fetchedInfractions);
    }
  };

  const calculateScore = (infractions) => {
    const totalPointsDeducted = infractions.reduce((acc, curr) => acc + curr.points, 0);
    const currentScore = 100 - totalPointsDeducted;
    setStudentScore(currentScore);

    // Menentukan nilai sikap berdasarkan skor saat ini.
    // Skor awal adalah 100, dan setiap pelanggaran mengurangi poin.
    // Semakin rendah skor, semakin banyak pelanggaran yang dilakukan.
    if (currentScore > 90) setAttitude('Sangat Baik');
    else if (currentScore >= 75) setAttitude('Baik');
    else if (currentScore >= 60) setAttitude('Cukup');
    else setAttitude('Kurang');
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchInfractions(selectedStudent);
    } else {
      setInfractions([]);
      setStudentScore(100);
      setAttitude('Sangat Baik');
    }
  }, [selectedStudent]);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Catatan Pelanggaran Siswa</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
          <input type="text" value={new Date().toLocaleDateString('id-ID')} readOnly className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kelas</label>
          <select onChange={(e) => setSelectedClass(e.target.value)} value={selectedClass} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Pilih Kelas</option>
            {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Siswa</label>
          <select onChange={(e) => setSelectedStudent(e.target.value)} value={selectedStudent} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" disabled={!selectedClass}>
            <option value="">Pilih Siswa</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Pelanggaran</label>
        <div className="flex flex-wrap gap-2 mt-2">
            {Object.keys(infractionTypes).map(type => (
                <button key={type} onClick={() => setInfractionType(type)} className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${infractionType === type ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-blue-500 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'}`}>
                    {type}
                </button>
            ))}
        </div>
      </div>
      {infractionType === 'Lainnya' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Detail Pelanggaran</label>
            <input
              type="text"
              value={customInfraction}
              onChange={(e) => setCustomInfraction(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Tuliskan pelanggaran spesifik"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poin Pelanggaran</label>
            <input
              type="number"
              value={customPoints}
              onChange={(e) => setCustomPoints(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Masukkan poin"
            />
          </div>
        </div>
      )}
      
      <button onClick={handleSaveInfraction} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 mb-6">Simpan Pelanggaran</button>

      {selectedStudent && (
        <div>
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Detail Pelanggaran Siswa</h3>
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Poin Awal</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">100</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Nilai Poin Pelanggaran</p>
                <p className="text-2xl font-bold text-red-500">{studentScore}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Nilai Sikap</p>
                <p className="text-2xl font-bold text-blue-500">{attitude}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800"><thead className="bg-gray-50 dark:bg-gray-700">
                <tr><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Tanggal</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Pelanggaran</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Poin</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Sanksi</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Aksi</th> {/* New column header */}</tr>
              </thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {infractions.map(inf => (
                  <tr key={inf.id}><td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900 dark:text-white">{new Date(inf.date).toLocaleDateString('id-ID')}</td><td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900 dark:text-white">{inf.infractionType}</td><td className="py-4 px-6 whitespace-nowrap text-sm text-red-500">{inf.points}</td><td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900 dark:text-white">{inf.sanction}</td><td className="py-4 px-6 whitespace-nowrap text-sm"> {/* New column for action */}<button onClick={() => handleDeleteInfraction(inf.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">Hapus</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PelanggaranPage;
