import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import moment from 'moment';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledTable from '../components/StyledTable'; // Assuming you have a StyledTable component
import ClockDisplay from '../components/ClockDisplay';

const AbsensiPage = () => {
  
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: "Hadir" }

  

  const autoSaveTimeout = useRef(null);

  useEffect(() => {
    const fetchActiveScheduleAndStudentsAndAttendance = async () => {
      if (!auth.currentUser) return;

      const userId = auth.currentUser.uid;
      const now = moment();
      const todayDayName = now.format('dddd');
      const dayMap = {
        'Sunday': 'Minggu',
        'Monday': 'Senin',
        'Tuesday': 'Selasa',
        'Wednesday': 'Rabu',
        'Thursday': 'Kamis',
        'Friday': 'Jumat',
        'Saturday': 'Sabtu',
      };
      const currentDayIndonesian = dayMap[todayDayName];
      const attendanceDate = now.format('YYYY-MM-DD');

      const scheduleQuery = query(
        collection(db, 'teachingSchedules'),
        where('userId', '==', userId),
        where('day', '==', currentDayIndonesian)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      let foundActiveSchedule = null;

      scheduleSnapshot.docs.forEach(doc => {
        const schedule = doc.data();
        const className = typeof schedule.class === 'object' && schedule.class !== null
          ? schedule.class.rombel
          : schedule.class;

        let startTime = moment(schedule.startTime, 'HH:mm');
        let endTime = moment(schedule.endTime, 'HH:mm');

        if (endTime.isBefore(startTime)) {
          endTime.add(1, 'day');
        }

        if (now.isBetween(startTime, endTime, null, '[]')) {
          foundActiveSchedule = { id: doc.id, ...schedule, class: className };
        }
      });

      setActiveSchedule(foundActiveSchedule);

      if (foundActiveSchedule) {
        const rombelName = foundActiveSchedule.class;
        if (rombelName) {
          const studentsQuery = query(
            collection(db, 'students'),
            where('userId', '==', userId),
            where('rombel', '==', rombelName),
            orderBy('absen')
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStudents(fetchedStudents);

          const existingAttendanceQuery = query(
            collection(db, 'attendance'),
            where('userId', '==', userId),
            where('date', '==', attendanceDate),
            where('rombel', '==', rombelName)
          );
          const existingAttendanceSnapshot = await getDocs(existingAttendanceQuery);
          const loadedAttendance = {};
          existingAttendanceSnapshot.docs.forEach(doc => {
            const data = doc.data();
            loadedAttendance[data.studentId] = data.status;
          });

          const initialAttendance = {};
          fetchedStudents.forEach(student => {
            initialAttendance[student.id] = loadedAttendance[student.id] || 'Hadir';
          });
          setAttendance(initialAttendance);
        }
      } else {
        setStudents([]);
        setAttendance({});
      }
    };

    fetchActiveScheduleAndStudentsAndAttendance();
    const interval = setInterval(fetchActiveScheduleAndStudentsAndAttendance, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = useCallback(async (scheduleToSave, studentsToSave, attendanceToSave) => {
    if (!scheduleToSave || !studentsToSave || studentsToSave.length === 0) {
      toast.error('Tidak ada jadwal aktif atau siswa untuk disimpan.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const attendanceDate = moment().format('YYYY-MM-DD');
      const rombelName = scheduleToSave.class;

      for (const student of studentsToSave) {
        const status = attendanceToSave[student.id];
        if (status) { // Only save if a status exists for the student
          const attendanceRef = doc(db, 'attendance', `${attendanceDate}-${rombelName}-${student.id}`);
          batch.set(attendanceRef, {
            userId: auth.currentUser.uid,
            date: attendanceDate,
            rombel: rombelName,
            studentId: student.id,
            status: status,
            timestamp: serverTimestamp(),
          }, { merge: true });
        }
      }

      if (batch._mutations.length === 0) {
        // No changes to save
        return;
      }

      await batch.commit();
      toast.success(`Absensi untuk kelas ${rombelName} berhasil disimpan!`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Gagal menyimpan absensi.');
    }
  }, []); // useCallback with no dependencies as we will pass state directly

  useEffect(() => {
    // Clear previous timeout if it exists
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    if (activeSchedule) {
      const now = moment();
      const endTime = moment(activeSchedule.endTime, 'HH:mm');

      if (endTime.isBefore(now)) {
        endTime.add(1, 'day');
      }

      const timeUntilEnd = endTime.diff(now);

      if (timeUntilEnd > 0) {
        // Pass the current state directly to the save function to avoid stale closures
        const scheduleToSave = activeSchedule;
        const studentsToSave = students;
        const attendanceToSave = attendance;

        autoSaveTimeout.current = setTimeout(() => {
          toast.success(`Waktu untuk kelas ${scheduleToSave.class} berakhir. Menyimpan absensi...`);
          handleSaveAttendance(scheduleToSave, studentsToSave, attendanceToSave);
        }, timeUntilEnd);
      }
    }

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [activeSchedule, students, attendance, handleSaveAttendance]);

  const columns = [
    {
      header: { label: 'No. Absen', className: 'w-16' }, // Apply width class here
      accessor: 'absen',
      cellClassName: 'w-16', // Apply width class to cell as well
    },
    {
      header: { label: 'NIS' },
      accessor: 'nis', // Assuming student object has a 'nis' field
    },
    {
      header: { label: 'Nama' },
      accessor: 'name', // Assuming student object has a 'name' field
    },
    {
      header: { label: 'Jenis Kelamin' },
      accessor: row => (row.gender === 'Laki-laki' ? 'L' : row.gender === 'Perempuan' ? 'P' : ''),
    },
    {
      header: { label: 'Absen' },
      accessor: row => (
        <div className="flex space-x-2">
          {[ { label: 'Hadir', value: 'Hadir', abbr: 'H' },
             { label: 'Sakit', value: 'Sakit', abbr: 'S' },
             { label: 'Ijin', value: 'Ijin', abbr: 'I' },
             { label: 'Alpha', value: 'Alpha', abbr: 'A' }].map(statusOption => (
            <label key={statusOption.value} className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-primary"
                name={`attendance-${row.id}`}
                value={statusOption.value}
                checked={attendance[row.id] === statusOption.value}
                onChange={() => handleAttendanceChange(row.id, statusOption.value)}
              />
              <span className="ml-2 text-text-light dark:text-text-dark">{statusOption.abbr}</span>
            </label>
          ))}
        </div>
      ),
    },
  ];

  



  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen">
      <h1 className="text-3xl font-bold text-primary-dark dark:text-primary-light mb-6">Absensi Siswa</h1>

      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
        
        {activeSchedule && (
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark">
            Kelas Aktif: {activeSchedule.class} ({activeSchedule.subject})
          </h2>
        )}
      </div>

      {activeSchedule ? (
        <>
          <div className="overflow-x-auto bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
            <StyledTable
              headers={columns.map(col => col.header)}
            >
              {students.map((student, index) => (
                <tr key={student.id || index} className={
                  index % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'
                }>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={`px-6 py-4 text-sm text-text-light dark:text-text-dark ${col.cellClassName || ''}`}>
                      {typeof col.accessor === 'function' ? col.accessor(student, index) : student[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </StyledTable>
          </div>
          <button
            onClick={() => handleSaveAttendance(activeSchedule, students, attendance)}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary-dark transition duration-300"
          >
            Simpan Absensi
          </button>
        </>
      ) : (
        <div className="text-center text-text-muted-light dark:text-text-muted-dark p-10 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <p className="text-lg">Tidak ada jadwal aktif saat ini. Silakan cek jadwal Anda.</p>
        </div>
      )}
    </div>
  );
};

export default AbsensiPage;