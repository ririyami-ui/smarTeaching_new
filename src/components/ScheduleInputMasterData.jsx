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
import { useSettings } from '../utils/SettingsContext';
import { indonesianHolidays, getHolidaysByYear } from '../utils/holidayData';
import { Trash2, RefreshCw, Globe, Plus, Calendar as CalendarIcon } from 'lucide-react';

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
  const { activeSemester, academicYear } = useSettings();
  const [day, setDay] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // New State for Schedule Type
  const [scheduleType, setScheduleType] = useState('teaching'); // 'teaching' | 'non-teaching'
  const [activityName, setActivityName] = useState(''); // For non-teaching activities

  const [schedules, setSchedules] = useState([]); // Stores the recurrence rules from Firestore
  const [events, setEvents] = useState([]); // Stores events for react-big-calendar
  const [programs, setPrograms] = useState([]);
  const [holidays, setHolidays] = useState([]); // State for holidays
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayEndDate, setNewHolidayEndDate] = useState(''); // New State for End Date
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayCategory, setNewHolidayCategory] = useState('semester_ganjil');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');

  // State for Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for preventing double submit
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // New State for Online Fetch Modal
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [onlineYear, setOnlineYear] = useState(moment().add(1, 'y').format('YYYY'));

  const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');

  // Semester and Year are handled by useSettings

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

  // Fetch Holidays from Firestore
  const fetchHolidays = useCallback(async (user) => {
    if (user) {
      const q = query(collection(db, 'holidays'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedHolidays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHolidays(fetchedHolidays);
      return fetchedHolidays;
    }
    return [];
  }, []);

  // Sync Static Holidays
  const handleSyncHolidays = async () => {
    if (!auth.currentUser || !academicYear) return;
    try {
      // Extract the two years involved in the academic cycle (e.g., "2025/2026" -> [2025, 2026])
      const yearParts = academicYear.split('/').map(y => y.trim());
      const relevantYears = yearParts.length === 2 ? yearParts : [yearParts[0]];

      const existingDates = holidays.map(h => h.date);

      // Filter indonesianHolidays to only include years relevant to current academic year
      const holidaysToadd = indonesianHolidays.filter(h => {
        const hYear = h.date.split('-')[0];
        return relevantYears.includes(hYear) && !existingDates.includes(h.date);
      });

      if (holidaysToadd.length === 0) {
        toast.success(`Data libur untuk tahun ajaran ${academicYear} sudah sinkron.`);
        return;
      }

      await Promise.all(holidaysToadd.map(h => addDoc(collection(db, 'holidays'), {
        userId: auth.currentUser.uid,
        date: h.date,
        name: h.name,
        type: 'national',
        category: 'lainnya' // Default for national holidays
      })));

      await fetchHolidays(auth.currentUser);
      toast.success(`Berhasil menyinkronkan ${holidaysToadd.length} hari libur untuk tahun ${academicYear}.`);
    } catch (error) {
      console.error("Error syncing holidays:", error);
      toast.error('Gagal menyinkronkan libur.');
    }
  };

  // Experimental Online Fetch
  const handleFetchOnlineHolidays = async () => {
    if (!auth.currentUser || !onlineYear) return;

    const year = onlineYear;
    setIsOnlineModalOpen(false); // Close modal first
    const toastId = toast.loading(`Mencari data libur online tahun ${year}...`);
    try {
      const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/ID`);
      if (!response.ok) throw new Error('Gagal mengambil data');

      const data = await response.json();
      const existingDates = holidays.map(h => h.date);
      const newHolidays = data.filter(h => !existingDates.includes(h.date));

      if (newHolidays.length === 0) {
        toast.dismiss(toastId);
        toast.success(`Data libur tahun ${year} sudah lengkap atau tidak ditemukan.`);
        return;
      }

      await Promise.all(newHolidays.map(h => addDoc(collection(db, 'holidays'), {
        userId: auth.currentUser.uid,
        date: h.date,
        name: h.localName || h.name,
        type: 'online'
      })));

      fetchHolidays(auth.currentUser);
      toast.dismiss(toastId);
      toast.success(`Berhasil menambahkan ${newHolidays.length} hari libur untuk tahun ${year}.`);
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Gagal mengambil data online. Coba lagi nanti atau gunakan input manual.');
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      semester_ganjil: 'Libur Semester Ganjil',
      semester_genap: 'Libur Semester Genap',
      tengah_semester: 'Kegiatan Tengah Semester (KTS)',
      ujian: 'Kegiatan Ujian',
      ujian_semester: 'Ujian Akhir Semester (PAS/PAT)',
      rapat: 'Rapat Dinas/Guru',
      workshop: 'Workshop / IHT',
      studi_tiru: 'Studi Tiru / Outbound',
      class_meeting: 'Class Meeting',
      keagamaan: 'Kegiatan Keagamaan',
      lainnya: 'Kegiatan Lainnya'
    };
    return labels[cat] || cat;
  };

  // Add Manual Holiday
  const handleAddManualHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !auth.currentUser) return;
    try {
      const holidayData = {
        userId: auth.currentUser.uid,
        name: newHolidayCategory === 'lainnya' ? newHolidayDescription : getCategoryLabel(newHolidayCategory),
        category: newHolidayCategory,
        description: newHolidayDescription,
        type: 'manual'
      };

      if (newHolidayEndDate && newHolidayEndDate !== newHolidayDate) {
        holidayData.startDate = newHolidayDate;
        holidayData.endDate = newHolidayEndDate;
        holidayData.date = newHolidayDate; // Fallback for simple queries
      } else {
        holidayData.date = newHolidayDate;
      }

      await addDoc(collection(db, 'holidays'), holidayData);

      await fetchHolidays(auth.currentUser);
      setNewHolidayDate('');
      setNewHolidayEndDate('');
      setNewHolidayName('');
      setNewHolidayDescription('');
      toast.success('Agenda sekolah berhasil ditambahkan.');
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast.error('Gagal menambah hari libur.');
    }
  };

  const handleDeleteHoliday = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Agenda',
      message: 'HAPUS AGENDA: Apakah Anda benar-benar yakin ingin menghapus agenda ini? (CUSTOM)',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'holidays', id));
          fetchHolidays(auth.currentUser);
          toast.success('Hari libur dihapus.');
        } catch (error) {
          toast.error('Gagal menghapus.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };


  // Function to generate calendar events from recurrence rules within semester bounds
  const generateCalendarEvents = useCallback((schedulesData, programsData = programs, holidaysData = holidays) => {
    const generated = [];
    const currentYear = moment().year();
    let semesterStartDate, semesterEndDate;

    if (activeSemester === 'Ganjil') {
      semesterStartDate = moment(`${currentYear}-07-01`); // July 1st
      semesterEndDate = moment(`${currentYear}-12-31`); // December 31st
    } else { // Genap
      semesterStartDate = moment(`${currentYear}-01-01`); // January 1st
      semesterEndDate = moment(`${currentYear}-06-30`); // June 30th
    }

    // Add Holidays to generated events
    holidaysData.forEach(h => {
      // Handle Range
      if (h.startDate && h.endDate) {
        const start = moment(h.startDate);
        const end = moment(h.endDate).endOf('day'); // Make sure it covers the whole end day

        // Check if overlaps with semester
        if (start.isSameOrBefore(semesterEndDate) && end.isSameOrAfter(semesterStartDate)) {
          generated.push({
            id: `holiday-${h.id}`,
            title: `LIBUR: ${h.name} (${start.format('DD/MM')} - ${end.format('DD/MM')})`,
            start: start.toDate(),
            end: end.toDate(),
            allDay: true,
            resource: { type: 'holiday', ...h },
            isHoliday: true
          });
        }
      }
      // Handle Single Date
      else if (h.date) {
        const hDate = moment(h.date);
        if (hDate.isBetween(semesterStartDate, semesterEndDate, null, '[]')) {
          generated.push({
            id: `holiday-${h.id}`,
            title: `LIBUR: ${h.name}`,
            start: hDate.toDate(),
            end: hDate.toDate(),
            allDay: true,
            resource: { type: 'holiday', ...h },
            isHoliday: true
          });
        }
      }
    });

    schedulesData.forEach((schedule) => {
      let startGeneratingFrom = moment.max(moment(), semesterStartDate);
      let currentWeek = moment(startGeneratingFrom).startOf('week');

      while (currentWeek.isSameOrBefore(semesterEndDate)) {
        const startDateTime = getNextDayOccurrence(schedule.day, schedule.startTime, currentWeek);
        const endDateTime = getNextDayOccurrence(schedule.day, schedule.endTime, currentWeek);

        const dateStr = moment(startDateTime).format('YYYY-MM-DD');

        // Check if date is in any holiday (single or range)
        const isHoliday = holidaysData.some(h => {
          if (h.startDate && h.endDate) {
            return moment(dateStr).isBetween(h.startDate, h.endDate, null, '[]');
          }
          return h.date === dateStr;
        });

        if (!isHoliday && moment(startDateTime).isBetween(semesterStartDate, semesterEndDate, null, '[]') && moment(startDateTime).isSameOrAfter(moment())) {

          let eventTitle = '';
          const isNonTeaching = schedule.type === 'non-teaching';

          if (isNonTeaching) {
            eventTitle = `${schedule.activityName || 'Kegiatan Non-KBM'}`;
            if (schedule.class && schedule.class !== 'Umum') {
              eventTitle += ` - ${schedule.class}`;
            }
          } else {
            // Topic Retrieval Logic (Only for Teaching)
            let topicTitle = '';
            const className = typeof schedule.class === 'object' ? schedule.class?.rombel : schedule.class;

            // Use master data classes for accurate level matching
            const classInfo = classes.find(c => c.rombel === className);
            const grade = classInfo ? classInfo.level : className?.match(/\d+/)?.[0];

            const normalizedSubject = schedule.subject?.toLowerCase().trim();
            const program = (programsData || []).find(p =>
              p.subject?.toLowerCase().trim() === normalizedSubject &&
              String(p.gradeLevel) === String(grade) &&
              p.semester === activeSemester &&
              p.academicYear === academicYear
            );

            if (program && program.promes && program.prota) {
              const startMonth = activeSemester === 'Ganjil' ? 6 : 0;
              const monthIndex = (moment(startDateTime).month() - startMonth + 12) % 12;

              // Improved Week Index calculation
              const monthConfig = program.pekanEfektif?.[monthIndex];
              const totalWeeksInMonth = monthConfig?.totalWeeks || 4;
              const weekIndex = Math.min(Math.floor((moment(startDateTime).date() - 1) / 7), totalWeeksInMonth - 1);

              const activeTopics = [];
              program.prota.forEach(row => {
                const key = `${row.id}_${monthIndex}_${weekIndex}`;
                if (program.promes[key] && parseInt(program.promes[key]) > 0) {
                  activeTopics.push(row.materi || row.kd);
                }
              });
              if (activeTopics.length > 0) topicTitle = ` [Topic: ${activeTopics[0]}]`;
            }
            eventTitle = `${schedule.subject} - ${schedule.class} (Jam ${schedule.startPeriod}-${schedule.endPeriod})${topicTitle}`;
          }

          generated.push({
            id: `${schedule.id}-${startDateTime.toISOString()}`,
            title: eventTitle,
            start: startDateTime,
            end: endDateTime,
            allDay: false,
            resource: { ...schedule, isNonTeaching }, // Pass isNonTeaching flag
          });
        }
        currentWeek.add(1, 'week');
      }
    });
    setEvents(generated);
  }, [activeSemester, programs, academicYear, classes, holidays]);

  // Fetch schedules and programs on component mount
  useEffect(() => {
    const fetchData = async (user) => {
      if (user) {
        // Fetch Schedules
        const qSchedules = query(teachingSchedulesCollectionRef, where('userId', '==', user.uid));
        const scheduleSnapshot = await getDocs(qSchedules);
        const fetchedSchedules = scheduleSnapshot.docs.map((doc) => {
          const scheduleData = doc.data();
          const className = typeof scheduleData.class === 'object' && scheduleData.class !== null
            ? scheduleData.class.rombel
            : scheduleData.class;
          return { id: doc.id, ...scheduleData, class: className };
        });
        setSchedules(fetchedSchedules);

        // Fetch Programs
        const qPrograms = query(collection(db, 'teachingPrograms'), where('userId', '==', user.uid));
        const programSnapshot = await getDocs(qPrograms);
        const fetchedPrograms = programSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrograms(fetchedPrograms);

        if (activeSemester) {
          const fetchedHolidays = await fetchHolidays(user);
          generateCalendarEvents(fetchedSchedules, fetchedPrograms, fetchedHolidays);
        }
      } else {
        setSchedules([]);
        setPrograms([]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(fetchData);
    return () => unsubscribe();
  }, [generateCalendarEvents, activeSemester, fetchHolidays]);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const handleAddSchedule = useCallback(async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submit

    setIsSubmitting(true);

    // Common validation: Start/End time is always required
    if (!day || !startTime || !endTime) {
      toast.error('Mohon lengkapi Hari, Jam Mulai, dan Jam Selesai.');
      setIsSubmitting(false);
      return;
    }

    // Validation based on type
    if (scheduleType === 'teaching') {
      if (!startPeriod || !endPeriod) {
        toast.error('Mohon isi Jam Ke dan Sampai Jam Ke untuk jadwal mengajar.');
        setIsSubmitting(false);
        return;
      }
      if (!selectedSubject || !selectedClass) {
        toast.error('Mohon pilih Mapel dan Kelas untuk jadwal mengajar.');
        setIsSubmitting(false);
        return;
      }
    }

    if (scheduleType === 'non-teaching' && !activityName) {
      toast.error('Mohon isi nama kegiatan untuk jadwal Non-KBM.');
      setIsSubmitting(false);
      return;
    }

    if (!auth.currentUser) return;

    try {
      const scheduleData = {
        userId: auth.currentUser.uid,
        day,
        startPeriod: scheduleType === 'teaching' ? parseInt(startPeriod) : 0,
        endPeriod: scheduleType === 'teaching' ? parseInt(endPeriod) : 0,
        startTime,
        endTime,
        semester: activeSemester,
        academicYear: academicYear,
        type: scheduleType, // Save type
      };

      if (scheduleType === 'teaching') {
        const subject = subjects.find(s => s.id === selectedSubject);
        const rombel = classes.find(c => c.id === selectedClass);
        scheduleData.subjectId = selectedSubject;
        scheduleData.subjectName = (subject?.name || '').trim();
        scheduleData.classId = selectedClass;
        scheduleData.className = rombel?.rombel || '';
        scheduleData.class = rombel?.rombel || ''; // Legacy support
        scheduleData.subject = (subject?.name || '').trim(); // Legacy support
        scheduleData.activityName = '';
      } else {
        scheduleData.activityName = activityName;
        scheduleData.subjectId = null;
        scheduleData.subjectName = '';
        scheduleData.subject = activityName; // Use activity name as subject for legacy view compatibility
        scheduleData.classId = selectedClass?.id || selectedClass || null;

        // If class is selected, use it. If not, mark as "Semua Kelas" or empty
        const rombel = selectedClass ? classes.find(c => c.id === selectedClass) : null;
        scheduleData.className = rombel?.rombel || 'Umum';
        scheduleData.class = rombel?.rombel || 'Umum'; // Legacy support
      }

      console.log('Attempting to add schedule:', scheduleData);

      const docRef = await addDoc(teachingSchedulesCollectionRef, scheduleData);
      const addedSchedule = { ...scheduleData, id: docRef.id };

      toast.success('Jadwal berhasil ditambahkan!');

      // Update local state and regenerate calendar events
      setSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules, addedSchedule];
        generateCalendarEvents(updatedSchedules, programs, holidays);
        return updatedSchedules;
      });

      // Clear form form logic
      setStartPeriod('');
      setEndPeriod('');
      setStartTime('');
      setEndTime('');

      if (scheduleType === 'non-teaching') {
        setActivityName('');
        // Don't necessarily clear class if they want to add multiple breaks for same class level
      } else {
        setSelectedSubject('');
        setSelectedClass(null);
      }
    } catch (error) {
      console.error("Error adding schedule: ", error);
      toast.error('Gagal menambah jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  }, [day, selectedClass, startPeriod, endPeriod, startTime, endTime, selectedSubject, generateCalendarEvents, scheduleType, activityName, subjects, classes, activeSemester, academicYear, teachingSchedulesCollectionRef, isSubmitting]);

  const handleDeleteSchedule = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Jadwal',
      message: 'HAPUS JADWAL: Apakah Anda benar-benar yakin ingin menghapus jadwal mengajar ini? (CUSTOM)',
      onConfirm: async () => {
        try {
          const scheduleDoc = doc(db, 'teachingSchedules', id);
          await deleteDoc(scheduleDoc);
          toast.success('Jadwal berhasil dihapus!');

          // Update local state and regenerate calendar events
          setSchedules((prevSchedules) => {
            const updatedSchedules = prevSchedules.filter(schedule => schedule.id !== id);
            generateCalendarEvents(updatedSchedules, programs, holidays);
            return updatedSchedules;
          });
        } catch (error) {
          console.error("Error deleting schedule:", error);
          toast.error('Gagal menghapus jadwal.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

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
        if (activeSemester) {
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

  // Event Style Getter
  const eventStyleGetter = (event, start, end, isSelected) => {
    let backgroundColor = '#3174ad';
    let borderColor = 'transparent';
    let borderStyle = 'solid';
    let color = 'white';

    if (event.resource?.isNonTeaching) {
      backgroundColor = '#FBCFE8'; // Light Pink
      color = '#B91C4B'; // Dark Red text
      borderStyle = 'dashed';
      borderColor = '#B91C4B';
    } else if (event.isHoliday) {
      backgroundColor = '#EF4444'; // Red for holidays
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: event.resource?.isNonTeaching ? 0.9 : 0.8,
        color,
        border: `1px ${borderStyle} ${borderColor}`,
        display: 'block',
        fontSize: '0.85em',
        fontWeight: event.resource?.isNonTeaching ? '600' : 'normal'
      }
    };
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Input Jadwal Mengajar</h2>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            Semester: {activeSemester} (Tahun Ajaran {academicYear})
          </p>
        </div>
        <button
          onClick={() => setIsHolidayModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm"
        >
          <CalendarIcon size={18} />
          Kelola Agenda Sekolah
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleAddSchedule} className="space-y-4">
            {/* Day Selection */}
            <div>
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

            {/* Schedule Type Toggle */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Kegiatan:</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScheduleType('teaching')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${scheduleType === 'teaching'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Mengajar (KBM)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('non-teaching')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${scheduleType === 'non-teaching'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Non-KBM (Istirahat/Lainnya)
                </button>
              </div>
            </div>

            {/* Conditional Inputs */}
            {scheduleType === 'teaching' ? (
              <>
                <div>
                  <label htmlFor="class" className="block text-gray-700 text-sm font-bold mb-2">Kelas:</label>
                  <select
                    id="class"
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.rombel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Mata Pelajaran:</label>
                  <select
                    id="subject"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="">Pilih Mata Pelajaran</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="activityName" className="block text-gray-700 text-sm font-bold mb-2">Nama Kegiatan:</label>
                  <input
                    id="activityName"
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="Contoh: Istirahat, Senam, Upacara"
                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="classOptional" className="block text-gray-700 text-sm font-bold mb-2">Kelas (Opsional):</label>
                  <select
                    id="classOptional"
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">Semua Kelas / Umum</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.rombel}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika berlaku untuk semua kelas.</p>
                </div>
              </>
            )}


            {scheduleType === 'teaching' && (
              <>
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
              </>
            )}

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





            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
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
              eventPropGetter={eventStyleGetter}
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
                    {schedules.slice().sort((a, b) => {
                      const dayA = daysOfWeek.indexOf(a.day);
                      const dayB = daysOfWeek.indexOf(b.day);
                      if (dayA !== dayB) return dayA - dayB;

                      const timeA = moment(a.startTime, 'HH:mm');
                      const timeB = moment(b.startTime, 'HH:mm');
                      return timeA.diff(timeB);
                    }).map((schedule) => (
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
      </div >
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

      {/* Holiday Management Modal */}
      {
        isHolidayModalOpen && (
          <Modal title="Kelola Agenda & Hari Libur Sekolah" onClose={() => setIsHolidayModalOpen(false)}>
            <div className="p-4">
              <div className="flex flex-col gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
                  <div>
                    <h4 className="font-bold text-blue-900">Sinkronisasi Data (2025-2026)</h4>
                    <p className="text-xs text-blue-600">Ambil data libur nasional dari sistem.</p>
                  </div>
                  <button
                    onClick={handleSyncHolidays}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    <RefreshCw size={16} /> Sinkron
                  </button>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between border border-purple-100">
                  <div>
                    <h4 className="font-bold text-purple-900">Cek Online (Eksperimental)</h4>
                    <p className="text-xs text-purple-600">Cari libur tahun depan dari internet.</p>
                  </div>
                  <button
                    onClick={() => setIsOnlineModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                  >
                    <Globe size={16} /> Cek Online
                  </button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-bold mb-2">Tambah Agenda / Libur Manual</h4>
                  <form onSubmit={handleAddManualHoliday} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Mulai</label>
                        <input
                          type="date"
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="border p-2 rounded w-full"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Sampai (Opsional)</label>
                        <input
                          type="date"
                          value={newHolidayEndDate}
                          min={newHolidayDate}
                          onChange={(e) => setNewHolidayEndDate(e.target.value)}
                          className="border p-2 rounded w-full"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500 block">Kategori Agenda</label>
                      <select
                        value={newHolidayCategory}
                        onChange={(e) => setNewHolidayCategory(e.target.value)}
                        className="border p-2 rounded w-full text-sm"
                        required
                      >
                        <option value="semester_ganjil">Libur Semester Ganjil</option>
                        <option value="semester_genap">Libur Semester Genap</option>
                        <option value="tengah_semester">Kegiatan Tengah Semester (KTS)</option>
                        <option value="ujian">Ujian Harian / PTS</option>
                        <option value="ujian_semester">Ujian Semester (PAS/PAT)</option>
                        <option value="rapat">Rapat Dinas/Guru</option>
                        <option value="workshop">Workshop / IHT</option>
                        <option value="studi_tiru">Studi Tiru / Outbound</option>
                        <option value="class_meeting">Class Meeting</option>
                        <option value="keagamaan">Kegiatan Keagamaan</option>
                        <option value="lainnya">Kegiatan Lainnya</option>
                      </select>

                      {newHolidayCategory === 'lainnya' && (
                        <input
                          type="text"
                          placeholder="Jelaskan kegiatannya..."
                          value={newHolidayDescription}
                          onChange={(e) => setNewHolidayDescription(e.target.value)}
                          className="border p-2 rounded w-full text-sm"
                          required
                        />
                      )}

                      <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 flex justify-center items-center gap-2 font-semibold">
                        <Plus size={18} /> Simpan Agenda
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <h4 className="font-bold mb-2">Daftar Agenda Sekolah ({holidays.length})</h4>
              <div className="max-h-60 overflow-y-auto border rounded divide-y">
                {holidays.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 text-sm">Belum ada data libur.</p>
                ) : (
                  holidays.sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate)).map(h => (
                    <div key={h.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <div className="text-sm font-bold">
                          {h.startDate && h.endDate
                            ? `${moment(h.startDate).format('DD MMM')} - ${moment(h.endDate).format('DD MMM YYYY')}`
                            : moment(h.date).format('DD MMMM YYYY')
                          }
                        </div>
                        <div className="text-xs text-gray-600">
                          {h.category ? (
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${h.category?.includes('semester') ? 'bg-red-500' :
                                h.category === 'tengah_semester' ? 'bg-purple-500' :
                                  h.category?.includes('ujian') ? 'bg-orange-500' :
                                    h.category === 'rapat' ? 'bg-blue-500' :
                                      h.category === 'workshop' ? 'bg-indigo-500' :
                                        h.category === 'keagamaan' ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}></span>
                              {getCategoryLabel(h.category)}
                              {h.category === 'lainnya' && h.description && `: ${h.description}`}
                            </span>
                          ) : h.name}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>
        )
      }

      {/* Confirmation Modal */}
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

      {/* Online Fetch Modal */}
      {isOnlineModalOpen && (
        <Modal title="Ambil Data Libur Online" onClose={() => setIsOnlineModalOpen(false)}>
          <div className="p-4">
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                <Globe size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Cari Libur Masa Depan</h4>
                <p className="text-xs text-slate-500">Gunakan fitur ini untuk mengambil data libur nasional secara otomatis dari server global.</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 block mb-2">Tentukan Tahun:</label>
              <input
                type="number"
                value={onlineYear}
                onChange={(e) => setOnlineYear(e.target.value)}
                className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-bold transition-all shadow-sm"
                placeholder="2027"
              />
              <p className="text-[10px] text-slate-400 mt-2 italic">*Data diambil dari API publik nager.at (NAGER ID)</p>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsOnlineModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleFetchOnlineHolidays}
                className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Mulai Cari
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div >
  );
};

export default ScheduleInputMasterData;
