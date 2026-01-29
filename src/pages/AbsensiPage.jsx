import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import moment from 'moment';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledTable from '../components/StyledTable'; // Assuming you have a StyledTable component
import ClockDisplay from '../components/ClockDisplay';
import { useSettings } from '../utils/SettingsContext';

import RunningText from '../components/RunningText';

const AbsensiPage = () => {

  const [activeSchedule, setActiveSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: "Hadir" }
  const [previousMaterial, setPreviousMaterial] = useState(null); // State for previous material
  const [previousLearningActivities, setPreviousLearningActivities] = useState(null); // State for previous learning activities
  const { activeSemester, academicYear } = useSettings();

  const autoSaveTimeout = useRef(null);

  useEffect(() => {
    const fetchActiveScheduleAndStudentsAndAttendance = async () => {
      if (!auth.currentUser) {
        return;
      }

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
        const className = schedule.className || (typeof schedule.class === 'object' && schedule.class !== null ? schedule.class.rombel : schedule.class);
        const classId = schedule.classId || '';
        const subjectId = schedule.subjectId || '';

        let startTime = moment(schedule.startTime, 'HH:mm');
        let endTime = moment(schedule.endTime, 'HH:mm');

        if (endTime.isBefore(startTime)) {
          endTime.add(1, 'day');
        }

        if (now.isBetween(startTime, endTime, null, '[]')) {
          foundActiveSchedule = { id: doc.id, ...schedule, class: className, classId, subjectId };
        }
      });

      setActiveSchedule(foundActiveSchedule);
      console.log("Active Schedule:", foundActiveSchedule);

      if (foundActiveSchedule) {
        const rombelName = foundActiveSchedule.class;
        console.log("Active Schedule Rombel Name:", rombelName);

        if (rombelName) {
          // Fetch the last teaching journal entry for the active class
          let lastJournalQuery = query(
            collection(db, 'teachingJournals'),
            where('userId', '==', userId),
            where('classId', '==', foundActiveSchedule.classId || rombelName),
            where('subjectId', '==', foundActiveSchedule.subjectId || foundActiveSchedule.subject),
            where('semester', '==', activeSemester),
            where('academicYear', '==', academicYear),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          let lastJournalSnapshot = await getDocs(lastJournalQuery);

          // Fallback for journal if first query is empty
          if (lastJournalSnapshot.empty) {
            lastJournalQuery = query(
              collection(db, 'teachingJournals'),
              where('userId', '==', userId),
              where(foundActiveSchedule.classId ? 'className' : 'classId', '==', rombelName),
              where(foundActiveSchedule.subjectId ? 'subjectName' : 'subjectId', '==', foundActiveSchedule.subject),
              where('semester', '==', activeSemester),
              where('academicYear', '==', academicYear),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            lastJournalSnapshot = await getDocs(lastJournalQuery);
          }

          if (!lastJournalSnapshot.empty) {
            const lastJournalEntry = lastJournalSnapshot.docs[0].data();
            console.log("Last Journal Entry:", lastJournalEntry);
            setPreviousMaterial(lastJournalEntry.material || 'Tidak ada materi sebelumnya');
            setPreviousLearningActivities(lastJournalEntry.learningActivities || 'Tidak ada aktivitas pembelajaran sebelumnya');
          } else {
            setPreviousMaterial('Tidak ada materi sebelumnya');
            setPreviousLearningActivities('Tidak ada aktivitas pembelajaran sebelumnya');
            console.log("No previous journal found.");
          }
        } else {
          setPreviousMaterial(null); // Clear if no relevant active schedule info
          setPreviousLearningActivities(null); // Clear if no relevant active schedule info
          console.log("No rombelName in active schedule, clearing previous material.");
        }

        // ... existing code for fetching students and attendance ...
        if (rombelName) {
          console.log("Fetching students for rombel:", rombelName, "or classId:", foundActiveSchedule.classId);
          let studentsQuery = query(
            collection(db, 'students'),
            where('userId', '==', userId),
            where('classId', '==', foundActiveSchedule.classId || rombelName),
            orderBy('absen')
          );
          let studentsSnapshot = await getDocs(studentsQuery);

          // Fallback for students if first query is empty (check rombel field)
          if (studentsSnapshot.empty) {
            console.log("Fallback search for students using rombel name:", rombelName);
            studentsQuery = query(
              collection(db, 'students'),
              where('userId', '==', userId),
              where('rombel', '==', rombelName),
              orderBy('absen')
            );
            studentsSnapshot = await getDocs(studentsQuery);
          }
          const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStudents(fetchedStudents);
          console.log("Fetched Students:", fetchedStudents);
          console.log("Number of students fetched:", fetchedStudents.length);


          const existingAttendanceQuery = query(
            collection(db, 'attendance'),
            where('userId', '==', userId),
            where('date', '==', attendanceDate),
            where('classId', '==', foundActiveSchedule.classId || rombelName),
            where('semester', '==', activeSemester),
            where('academicYear', '==', academicYear)
          );
          const existingAttendanceSnapshot = await getDocs(existingAttendanceQuery);
          const loadedAttendance = {};
          existingAttendanceSnapshot.docs.forEach(doc => {
            const data = doc.data();
            loadedAttendance[data.studentId] = data.status;
          });

          // FIXED: Only reset attendance if it's a DIFFERENT schedule or first load
          // We check if the student list length is different or if the schedule ID changed
          setAttendance(prev => {
            // If we already have attendance data for these students, keep it.
            // Only if it's a fresh load (empty prev) or different class logic would we want to reset?
            // Actually, the best check is: if we are in the same schedule, DO NOT overwrite local state with DB state
            // unless the DB state has "newer" info? But here local > DB until saved.
            // So we effectively just initialize "Hadir" for keys that don't exist.

            const newAttendance = { ...prev };
            fetchedStudents.forEach(student => {
              if (!newAttendance[student.id]) {
                newAttendance[student.id] = loadedAttendance[student.id] || 'Hadir';
              }
              // If it exists in prev (local state), we KEEP it, ignoring loadedAttendance (server state)
              // This acts as a "draft" mode.
            });
            return newAttendance;
          });
        }
      } else {
        setStudents([]);
        setAttendance({});
        setPreviousMaterial(null); // Clear previous material if no active schedule
        console.log("No active schedule, clearing students, attendance, and previous material.");
      }
    };

    fetchActiveScheduleAndStudentsAndAttendance();
    const interval = setInterval(fetchActiveScheduleAndStudentsAndAttendance, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeSemester, academicYear]);

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
          const attendanceRef = doc(db, 'attendance', `${attendanceDate}-${scheduleToSave.classId || rombelName}-${student.id}`);
          batch.set(attendanceRef, {
            userId: auth.currentUser.uid,
            date: attendanceDate,
            rombel: rombelName,
            classId: scheduleToSave.classId || '',
            studentId: student.id,
            status: status,
            semester: activeSemester,
            academicYear: academicYear,
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
        <div className="flex items-center gap-1 sm:gap-3">
          {[{ label: 'Hadir', value: 'Hadir', color: 'peer-checked:bg-green-500 peer-checked:text-white', bg: 'bg-green-50' },
          { label: 'Sakit', value: 'Sakit', color: 'peer-checked:bg-yellow-500 peer-checked:text-white', bg: 'bg-yellow-50' },
          { label: 'Ijin', value: 'Ijin', color: 'peer-checked:bg-blue-500 peer-checked:text-white', bg: 'bg-blue-50' },
          { label: 'Alpha', value: 'Alpha', color: 'peer-checked:bg-red-500 peer-checked:text-white', bg: 'bg-red-50' }].map(statusOption => (
            <label key={statusOption.value} className="relative flex flex-col items-center cursor-pointer group">
              <input
                type="radio"
                className="sr-only peer"
                name={`attendance-${row.id}`}
                value={statusOption.value}
                checked={attendance[row.id] === statusOption.value}
                onChange={() => handleAttendanceChange(row.id, statusOption.value)}
              />
              <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-600 ${statusOption.bg} dark:bg-gray-800 transition-all duration-300 ${statusOption.color} shadow-sm group-hover:scale-110 active:scale-95`}>
                <span className="text-xs sm:text-sm font-black">{statusOption.label.charAt(0)}</span>
              </div>
              <span className="text-[10px] hidden sm:block mt-1 font-bold text-gray-500 uppercase">{statusOption.label}</span>
            </label>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6 bg-background-light dark:bg-background-dark min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary-dark dark:text-primary-light mb-6">Absensi Siswa</h1>

      <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl shadow-lg mb-6 border border-gray-200 dark:border-gray-700">
        {/* Subtle Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Class Information (Left) */}
          <div className="flex-1 text-center md:text-left">
            {activeSchedule ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-widest opacity-70">Sesi Belajar Aktif</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {activeSchedule.class} — {activeSchedule.subject}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                  <div className="px-3 py-1 bg-primary/10 dark:bg-primary/20 rounded-full text-xs font-bold text-primary dark:text-primary-light border border-primary/20">
                    Smt {activeSemester}
                  </div>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {academicYear}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="animate-pulse">⏳</span>
                </div>
                <p className="text-sm font-medium italic">Menunggu jadwal aktif berikutnya...</p>
              </div>
            )}
          </div>

          {/* Clock Display (Center/Right) */}
          <div className="flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
            <ClockDisplay size="sm" variant="minimal" />
          </div>
        </div>

        {/* Previous Material Section (Footer of Header) */}
        {(previousMaterial || previousLearningActivities) && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Review Sesi Terakhir:</span>
            </div>
            <div className="flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                {previousMaterial === 'Tidak ada materi sebelumnya' ? 'Belum ada catatan materi dari jurnal pertemuan terakhir.' : previousMaterial}
                {previousLearningActivities && previousLearningActivities !== 'Tidak ada aktivitas pembelajaran sebelumnya' && ` — ${previousLearningActivities}`}
              </p>
            </div>
          </div>
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
        <RunningText text="Tidak ada jadwal aktif saat ini. Silakan cek jadwal Anda." />
      )}
    </div>
  );
};

export default AbsensiPage;