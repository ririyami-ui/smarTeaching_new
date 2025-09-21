import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore'; // Added updateDoc
import { db, auth } from '../firebase';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import toast from 'react-hot-toast';

// Import Styled Components
import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import Modal from './Modal'; // Import Modal
import ScheduleEditor from './ScheduleEditor'; // Import ScheduleEditor

const localizer = momentLocalizer(moment);

// Helper function to get the next occurrence of a day of the week
const getNextDayOccurrence = (dayOfWeek, timeString, startDate = moment()) => {
  const daysMap = {
    'Minggu': 0,
    'Senin': 1,
    'Selasa': 2,
    'Rabu': 3,
    'Kamis': 4,
    'Jumat': 5,
    'Sabtu': 6,
  };
  const targetDay = daysMap[dayOfWeek];
  let currentMoment = moment(startDate);
  let dayDiff = targetDay - currentMoment.day();
  if (dayDiff < 0) {
    dayDiff += 7; // Move to next week if the day has already passed this week
  }
  currentMoment.add(dayDiff, 'days');
  
  // Set the time
  const [hours, minutes] = timeString.split(':').map(Number);
  currentMoment.hour(hours).minute(minutes).second(0).millisecond(0);
  
  return currentMoment.toDate();
};

const ScheduleInputMasterData = () => {
  const [day, setDay] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [schedules, setSchedules] = useState([]); // Stores the recurrence rules from Firestore
  const [events, setEvents] = useState([]); // Stores events for react-big-calendar
  const [currentSemester, setCurrentSemester] = useState('');

  // State for Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');

  // Determine current semester
  useEffect(() => {
    const month = moment().month() + 1; // moment().month() is 0-indexed
    if (month >= 7 && month <= 12) {
      setCurrentSemester('Ganjil');
    } else {
      setCurrentSemester('Genap');
    }
  }, []);

  // Fetch subjects and classes from Firestore
  useEffect(() => {
    const fetchMasterData = async (user) => {
      if (user) {
        // Fetch Subjects for the current user
        const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));
        const subjectData = await getDocs(subjectsQuery);
        setSubjects(subjectData.docs.map((doc) => ({ id: doc.id, name: doc.data().name })));

        // Fetch Classes (Rombel) for the current user
        const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
        const classData = await getDocs(classesQuery);
        const fetchedClasses = classData.docs.map((doc) => ({ id: doc.id, rombel: doc.data().rombel }));
        const sortedClasses = fetchedClasses.sort((a, b) => a.rombel.localeCompare(b.rombel)); // Sort by rombel name
        setClasses(sortedClasses);
      } else {
        // Clear data if user logs out
        setSubjects([]);
        setClasses([]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(fetchMasterData);
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // Function to generate calendar events from recurrence rules within semester bounds
  const generateCalendarEvents = useCallback((schedulesData) => {
    const generated = [];
    const currentYear = moment().year();
    let semesterStartDate, semesterEndDate;

    if (currentSemester === 'Ganjil') {
      semesterStartDate = moment(`${currentYear}-07-01`); // July 1st
      semesterEndDate = moment(`${currentYear}-12-31`); // December 31st
    } else { // Genap
      semesterStartDate = moment(`${currentYear}-01-01`); // January 1st
      semesterEndDate = moment(`${currentYear}-06-30`); // June 30th
    }

    schedulesData.forEach((schedule) => {
      // Start generating from the semester start date or current date, whichever is later
      let startGeneratingFrom = moment.max(moment(), semesterStartDate);

      // Generate events for the entire semester
      let currentWeek = moment(startGeneratingFrom).startOf('week');
      while (currentWeek.isSameOrBefore(semesterEndDate)) {
        const startDateTime = getNextDayOccurrence(schedule.day, schedule.startTime, currentWeek);
        const endDateTime = getNextDayOccurrence(schedule.day, schedule.endTime, currentWeek);

        // Only add event if it falls within the semester and is not in the past
        if (moment(startDateTime).isBetween(semesterStartDate, semesterEndDate, null, '[]') && moment(startDateTime).isSameOrAfter(moment())) {
          generated.push({
            id: `${schedule.id}-${startDateTime.toISOString()}`, // Unique ID for each generated event
            title: `${schedule.subject} - ${schedule.class} (Jam ${schedule.startPeriod}-${schedule.endPeriod})`,
            start: startDateTime,
            end: endDateTime,
            allDay: false,
            resource: schedule, // Store original schedule data
          });
        }
        currentWeek.add(1, 'week');
      }
    });
    setEvents(generated);
  }, [currentSemester]); // Regenerate when semester changes

  // Fetch schedules (recurrence rules) from Firestore on component mount
  useEffect(() => {
    const getSchedules = async (user) => {
      if (user) {
        const q = query(teachingSchedulesCollectionRef, where('userId', '==', user.uid));
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => {
          const scheduleData = doc.data();
          const className = typeof scheduleData.class === 'object' && scheduleData.class !== null
            ? scheduleData.class.rombel
            : scheduleData.class;
          return { id: doc.id, ...scheduleData, class: className };
        });
        setSchedules(fetchedSchedules);
        // Only generate events if currentSemester is determined
        if (currentSemester) {
          generateCalendarEvents(fetchedSchedules);
        }
      } else {
        setSchedules([]); // Clear schedules if user logs out
      }
    };

    const unsubscribe = auth.onAuthStateChanged(getSchedules);
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [generateCalendarEvents, currentSemester]);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const handleAddSchedule = useCallback(async (e) => {
    e.preventDefault();
    if (day && selectedClass && startPeriod && endPeriod && startTime && endTime && selectedSubject) {
      const newSchedule = {
        day,
        class: selectedClass.rombel,
        startPeriod: parseInt(startPeriod),
        endPeriod: parseInt(endPeriod),
        startTime,
        endTime,
        subject: selectedSubject,
        userId: auth.currentUser.uid,
      };
      console.log('Attempting to add schedule. Current User UID:', auth.currentUser.uid);
      // Save the recurrence rule to Firestore
      const docRef = await addDoc(teachingSchedulesCollectionRef, newSchedule);
      const addedSchedule = { ...newSchedule, id: docRef.id };
      toast.success('Jadwal berhasil ditambahkan!');

      // Update local state and regenerate calendar events
      setSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules, addedSchedule];
        generateCalendarEvents(updatedSchedules);
        return updatedSchedules;
      });

      // Clear form
      setDay('');
      setSelectedClass('');
      setStartPeriod('');
      setEndPeriod('');
      setStartTime('');
      setEndTime('');
      setSelectedSubject('');
    } else {
      toast.error('Silakan isi semua kolom.');
    }
  }, [day, selectedClass, startPeriod, endPeriod, startTime, endTime, selectedSubject, generateCalendarEvents]);

  const handleDeleteSchedule = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      const scheduleDoc = doc(db, 'teachingSchedules', id);
      await deleteDoc(scheduleDoc);
      toast.success('Jadwal berhasil dihapus!');

      // Update local state and regenerate calendar events
      setSchedules((prevSchedules) => {
        const updatedSchedules = prevSchedules.filter(schedule => schedule.id !== id);
        generateCalendarEvents(updatedSchedules);
        return updatedSchedules;
      });
    }
  }, [generateCalendarEvents]);

  // Edit Schedule Handlers
  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleSaveSchedule = () => {
    // Re-fetch schedules to ensure the list is updated after an edit
    const getSchedules = async () => {
      if (auth.currentUser) {
        const q = query(teachingSchedulesCollectionRef, where('userId', '==', auth.currentUser.uid));
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => {
          const scheduleData = doc.data();
          const className = typeof scheduleData.class === 'object' && scheduleData.class !== null
            ? scheduleData.class.rombel
            : scheduleData.class;
          return { id: doc.id, ...scheduleData, class: className };
        });
        setSchedules(fetchedSchedules);
        if (currentSemester) {
          generateCalendarEvents(fetchedSchedules);
        }
      } else {
        setSchedules([]); // Clear schedules if user logs out
      }
    };
    getSchedules();
    toast.success('Jadwal berhasil diperbarui!');
    handleCloseModal();
  };

  const { defaultDate, scrollToTime } = useMemo(
    () => ({
      defaultDate: new Date(), // Current date
      scrollToTime: moment().toDate(),
    }),
    [],
  );

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Input Jadwal Mengajar</h2>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">
        Semester: {currentSemester} ({moment().year()})
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleAddSchedule}>
            <div className="mb-4">
              <label htmlFor="day" className="block text-gray-700 text-sm font-bold mb-2">Hari:</label>
              <select
                id="day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Pilih Hari</option>
                {daysOfWeek.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="class" className="block text-gray-700 text-sm font-bold mb-2">Kelas:</label>
              <select
                id="class"
                value={selectedClass ? selectedClass.rombel : ''}
                onChange={(e) => setSelectedClass(classes.find(c => c.rombel === e.target.value))}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Pilih Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.rombel}>{c.rombel}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="startPeriod" className="block text-gray-700 text-sm font-bold mb-2">Jam ke:</label>
              <input
                type="number"
                id="startPeriod"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="endPeriod" className="block text-gray-700 text-sm font-bold mb-2">Sampai jam ke:</label>
              <input
                type="number"
                id="endPeriod"
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="startTime" className="block text-gray-700 text-sm font-bold mb-2">Waktu Mulai:</label>
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="endTime" className="block text-gray-700 text-sm font-bold mb-2">Waktu Selesai:</label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Mata Pelajaran:</label>
              <select
                id="subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Simpan Jadwal
            </button>
          </form>
        </div>
        <div className="md:col-span-2">
          <div style={{ height: '500px' }} className="mb-6">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              defaultView="week"
              defaultDate={defaultDate}
              scrollToTime={scrollToTime}
              views={['month', 'week', 'day', 'agenda']}
            />
          </div>

          {/* List of Schedules with Delete Button */}
          <div className="p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Daftar Jadwal Tersimpan</h3>
            {schedules.length === 0 ? (
              <p>Tidak ada jadwal yang tersimpan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Hari</th>
                      <th className="py-2 px-4 border-b text-left">Kelas</th>
                      <th className="py-2 px-4 border-b text-left">Mata Pelajaran</th>
                      <th className="py-2 px-4 border-b text-left">Waktu</th>
                      <th className="py-2 px-4 border-b text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td className="py-2 px-4 border-b">{schedule.day}</td>
                        <td className="py-2 px-4 border-b">{schedule.class}</td>
                        <td className="py-2 px-4 border-b">{schedule.subject}</td>
                        <td className="py-2 px-4 border-b">{schedule.startTime} - {schedule.endTime} (Jam {schedule.startPeriod}-{schedule.endPeriod})</td>
                        <td className="py-2 px-4 border-b">
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition duration-200 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <Modal title="Edit Jadwal" onClose={handleCloseModal}>
          <ScheduleEditor
            scheduleData={selectedSchedule}
            onSave={handleSaveSchedule}
            onClose={handleCloseModal}
            subjects={subjects}
            classes={classes}
          />
        </Modal>
      )}
    </div>
  );
};

export default ScheduleInputMasterData;
