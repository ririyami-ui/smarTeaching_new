import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import { Calendar as RBCalendar, momentLocalizer, Event as RBCEvent } from 'react-big-calendar';
const Calendar = RBCalendar as unknown as React.ComponentType<Record<string, unknown>>;
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import toast from 'react-hot-toast';
import Modal from './Modal';
import ScheduleEditor from './ScheduleEditor';
import { useSettings } from '../utils/SettingsContext';
import { indonesianHolidays } from '../utils/holidayData';
import { Trash2, RefreshCw, Globe, Plus, Calendar as CalendarIcon } from 'lucide-react';
import type { User } from 'firebase/auth';

const localizer = momentLocalizer(moment);

interface SubjectItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ClassItem {
  id: string;
  rombel: string;
  level?: string;
  [key: string]: unknown;
}

interface TemplateItem {
  id: string;
  name: string;
  isActive: boolean;
  userId: string;
  createdAt: unknown;
}

interface HolidayItem {
  id: string;
  userId: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  name: string;
  type?: string;
  category?: string;
  description?: string;
}

interface ScheduleItem {
  id: string;
  userId: string;
  day: string;
  startPeriod: number;
  endPeriod: number;
  startTime: string;
  endTime: string;
  semester: string;
  academicYear: string;
  templateId?: string;
  type: string;
  activityName?: string;
  subjectId?: string;
  subjectName?: string;
  subject?: string;
  classId?: string;
  className?: string;
  class?: string;
  [key: string]: unknown;
}

interface CalendarResource {
  isNonTeaching?: boolean;
  type?: string;
  [key: string]: unknown;
}

interface CalendarEvent extends RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource?: CalendarResource;
  isHoliday?: boolean;
}

interface ProgramItem {
  id: string;
  subject: string;
  gradeLevel: string;
  semester: string;
  academicYear: string;
  promes?: Record<string, string>;
  prota?: Array<{ id: string; materi?: string; kd?: string }>;
  pekanEfektif?: Array<{ totalWeeks?: number }>;
  [key: string]: unknown;
}

interface HolidayPayload {
  date?: string;
  startDate?: string;
  endDate?: string;
  name: string;
  category?: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
}

interface SchedulePayload {
  userId: string;
  day: string;
  startPeriod: number;
  endPeriod: number;
  startTime: string;
  endTime: string;
  semester: string;
  academicYear: string;
  templateId: string | null;
  type: string;
  activityName?: string;
  subjectId?: string | null;
  subjectName?: string;
  subject?: string;
  classId?: string | null;
  className?: string;
  class?: string;
  [key: string]: unknown;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

const getNextDayOccurrence = (dayOfWeek: string, timeString: string, startDate = moment()) => {
  const daysMap: Record<string, number> = {
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
    dayDiff += 7;
  }
  currentMoment.add(dayDiff, 'days');

  const [hours, minutes] = timeString.split(':').map(Number);
  currentMoment.hour(hours).minute(minutes).second(0).millisecond(0);

  return currentMoment.toDate();
};

const ScheduleInputMasterData: React.FC = () => {
  const { user } = useAuth();
  const { activeSemester, academicYear, schoolDays: contextSchoolDays, activeTemplateId, activeTemplateName } = useSettings();
  const [schoolDays, setSchoolDays] = useState<number>(contextSchoolDays || 6);

  const [day, setDay] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Template States
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(activeTemplateId || null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // New State for Schedule Type
  const [scheduleType, setScheduleType] = useState<'teaching' | 'non-teaching'>('teaching');
  const [activityName, setActivityName] = useState('');

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayEndDate, setNewHolidayEndDate] = useState('');
  const [, setNewHolidayName] = useState('');
  const [newHolidayCategory, setNewHolidayCategory] = useState('semester_ganjil');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');

  // State for Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ isOpen: false, title: '', message: '', onConfirm: null });

  // New State for Online Fetch Modal
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [onlineYear, setOnlineYear] = useState(moment().add(1, 'y').format('YYYY'));

  const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');

  // Fetch subjects, classes, AND templates from Firestore
  useEffect(() => {
    const fetchMasterData = async (user: User | null) => {
      if (user) {
        setIsLoadingTemplates(true);
        try {
          const templatesQuery = query(collection(db, 'scheduleTemplates'), where('userId', '==', user.uid));
          const templateSnapshot = await getDocs(templatesQuery);
          let fetchedTemplates: TemplateItem[] = templateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemplateItem));

          if (fetchedTemplates.length === 0) {
            const defaultTemplate = {
              userId: user.uid,
              name: 'Jadwal Normal',
              isActive: true,
              createdAt: serverTimestamp()
            };
            const tempDoc = await addDoc(collection(db, 'scheduleTemplates'), defaultTemplate);
            const templateId = tempDoc.id;
            fetchedTemplates = [{ id: templateId, ...defaultTemplate } as TemplateItem];

            await setDoc(doc(db, 'users', user.uid), {
              activeTemplateId: templateId,
              activeTemplateName: 'Jadwal Normal'
            }, { merge: true });

            const schedulesQuery = query(collection(db, 'teachingSchedules'), where('userId', '==', user.uid));
            const schedulesSnapshot = await getDocs(schedulesQuery);
            const batch = writeBatch(db);
            let migrationCount = 0;
            schedulesSnapshot.docs.forEach(schedDoc => {
              if (!schedDoc.data().templateId) {
                batch.update(schedDoc.ref, { templateId: templateId });
                migrationCount++;
              }
            });
            if (migrationCount > 0) {
              await batch.commit();
            }
            setSelectedTemplateId(templateId);
          } else {
            if (!selectedTemplateId) {
              const active = fetchedTemplates.find(t => t.isActive) || fetchedTemplates[0];
              setSelectedTemplateId(active.id);
            }
          }
          setTemplates(fetchedTemplates);

          const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));
          const subjectData = await getDocs(subjectsQuery);
          setSubjects(subjectData.docs.map((doc) => ({ id: doc.id, name: doc.data().name })));

          const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
          const classData = await getDocs(classesQuery);
          const fetchedClasses: ClassItem[] = classData.docs.map((doc) => ({
            id: doc.id,
            rombel: doc.data().rombel,
            level: doc.data().level
          }));
          const sortedClasses = fetchedClasses.sort((a, b) => a.rombel.localeCompare(b.rombel));
          setClasses(sortedClasses);

        } finally {
          setIsLoadingTemplates(false);
        }
      } else {
        setSubjects([]);
        setClasses([]);
        setTemplates([]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(fetchMasterData);
    return () => unsubscribe();
  }, [selectedTemplateId]);

  useEffect(() => {
    if (activeTemplateId) {
      setSelectedTemplateId(activeTemplateId);
    }
  }, [activeTemplateId]);

  useEffect(() => {
    if (contextSchoolDays !== undefined) setSchoolDays(contextSchoolDays);
  }, [contextSchoolDays]);

  const handleSchoolDaysChange = async (value: number) => {
    if (value !== 5 && value !== 6) return;
    setSchoolDays(value);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { schoolDays: value }, { merge: true });
        toast.success(`Hari sekolah diubah ke ${value} hari/minggu`);
      } catch (e) {
        console.error('Error saving schoolDays:', e);
        toast.error('Gagal menyimpan pengaturan.');
      }
    }
  };

  const fetchHolidays = useCallback(async (user: User | null) => {
    if (user) {
      const q = query(collection(db, 'holidays'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedHolidays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HolidayItem));
      setHolidays(fetchedHolidays);
      return fetchedHolidays;
    }
    return [];
  }, []);

  const handleSyncHolidays = async () => {
    if (!user || !academicYear) return;
    try {
      const yearParts = academicYear.split('/').map(y => y.trim());
      const relevantYears = yearParts.length === 2 ? yearParts : [yearParts[0]];

      const existingDates = holidays.map(h => h.date);

      const holidaysToadd = indonesianHolidays.filter(h => {
        const hYear = h.date.split('-')[0];
        return relevantYears.includes(hYear) && !existingDates.includes(h.date);
      });

      if (holidaysToadd.length === 0) {
        toast.success(`Data libur untuk tahun ajaran ${academicYear} sudah sinkron.`);
        return;
      }

      await Promise.all(holidaysToadd.map(h => addDoc(collection(db, 'holidays'), {
        userId: user.uid,
        date: h.date,
        name: h.name,
        type: 'national',
        category: 'lainnya'
      })));

      await fetchHolidays(user);
      toast.success(`Berhasil menyinkronkan ${holidaysToadd.length} hari libur untuk tahun ${academicYear}.`);
    } catch (error) {
      console.error("Error syncing holidays:", error);
      toast.error('Gagal menyinkronkan libur.');
    }
  };

  const handleFetchOnlineHolidays = async () => {
    if (!user || !onlineYear) return;

    const year = onlineYear;
    setIsOnlineModalOpen(false);
    const toastId = toast.loading(`Mencari data libur online tahun ${year}...`);
    try {
      const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/ID`);
      if (!response.ok) throw new Error('Gagal mengambil data');

      const data: HolidayPayload[] = await response.json();
      const existingDates = holidays.map(h => h.date);
      const newHolidays = data.filter((h: HolidayPayload) => !existingDates.includes(h.date));

      if (newHolidays.length === 0) {
        toast.dismiss(toastId);
        toast.success(`Data libur tahun ${year} sudah lengkap atau tidak ditemukan.`);
        return;
      }

      await Promise.all(newHolidays.map((h: HolidayPayload) => addDoc(collection(db, 'holidays'), {
        userId: user.uid,
        date: h.date,
        name: h.localName || h.name,
        type: 'online'
      })));

      fetchHolidays(user);
      toast.dismiss(toastId);
      toast.success(`Berhasil menambahkan ${newHolidays.length} hari libur untuk tahun ${year}.`);
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Gagal mengambil data online. Coba lagi nanti atau gunakan input manual.');
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
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

  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);

  const handleAddManualHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !user) return;

    try {
      const holidayData: Record<string, unknown> = {
        userId: user.uid,
        name: newHolidayCategory === 'lainnya' ? newHolidayDescription : getCategoryLabel(newHolidayCategory),
        category: newHolidayCategory,
        description: newHolidayDescription,
        type: 'manual'
      };

      if (newHolidayEndDate && newHolidayEndDate !== newHolidayDate) {
        holidayData.startDate = newHolidayDate;
        holidayData.endDate = newHolidayEndDate;
        holidayData.date = newHolidayDate;
      } else {
        holidayData.date = newHolidayDate;
        holidayData.startDate = newHolidayDate;
        holidayData.endDate = newHolidayDate;
      }

      if (editingHolidayId) {
        await updateDoc(doc(db, 'holidays', editingHolidayId), holidayData);
        toast.success('Agenda berhasil diperbarui.');
        setEditingHolidayId(null);
      } else {
        await addDoc(collection(db, 'holidays'), holidayData);
        toast.success('Agenda sekolah berhasil ditambahkan.');
      }

      await fetchHolidays(user);

      setNewHolidayDate('');
      setNewHolidayEndDate('');
      setNewHolidayName('');
      setNewHolidayDescription('');
      setNewHolidayCategory('lainnya');

    } catch (error) {
      console.error("Error saving holiday:", error);
      toast.error('Gagal menyimpan agenda.');
    }
  };

  const handleDeleteHoliday = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Agenda',
      message: 'Apakah Anda benar-benar yakin ingin menghapus agenda ini?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'holidays', id));
          fetchHolidays(user);
          toast.success('Hari libur dihapus.');
        } catch {
          toast.error('Gagal menghapus.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const generateCalendarEvents = useCallback((schedulesData: ScheduleItem[], programsData = programs, holidaysData = holidays) => {
    const generated: CalendarEvent[] = [];
    const currentYear = moment().year();
    let semesterStartDate: moment.Moment, semesterEndDate: moment.Moment;

    if (activeSemester === 'Ganjil') {
      semesterStartDate = moment(`${currentYear}-07-01`);
      semesterEndDate = moment(`${currentYear}-12-31`);
    } else {
      semesterStartDate = moment(`${currentYear}-01-01`);
      semesterEndDate = moment(`${currentYear}-06-30`);
    }

    holidaysData.forEach(h => {
      if (h.startDate && h.endDate) {
        const start = moment(h.startDate);
        const end = moment(h.endDate).endOf('day');

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
      } else if (h.date) {
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
            let topicTitle = '';
            const className = typeof schedule.class === 'object' ? (schedule.class as Record<string, string> | undefined)?.rombel : schedule.class;

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

              const monthConfig = program.pekanEfektif?.[monthIndex];
              const totalWeeksInMonth = monthConfig?.totalWeeks || 4;
              const weekIndex = Math.min(Math.floor((moment(startDateTime).date() - 1) / 7), totalWeeksInMonth - 1);

              const activeTopics: string[] = [];
              (program.prota || []).forEach(row => {
                const key = `${row.id}_${monthIndex}_${weekIndex}`;
                const promesVal = program.promes?.[key];
                if (promesVal && parseInt(promesVal ?? '0') > 0) {
                  activeTopics.push(row.materi ?? row.kd ?? '');
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
            resource: { ...schedule, isNonTeaching },
          });
        }
        currentWeek.add(1, 'week');
      }
    });
    setEvents(generated);
  }, [activeSemester, programs, academicYear, classes, holidays]);

  useEffect(() => {
    const fetchData = async (user: User | null) => {
      if (user) {
        const qSchedules = query(
          teachingSchedulesCollectionRef,
          where('userId', '==', user.uid),
          where('templateId', '==', selectedTemplateId)
        );
        const scheduleSnapshot = await getDocs(qSchedules);
        const fetchedSchedules = scheduleSnapshot.docs.map((doc) => {
          const scheduleData = doc.data();
          const className = typeof scheduleData.class === 'object' && scheduleData.class !== null
            ? scheduleData.class.rombel
            : scheduleData.class;
          return { id: doc.id, ...scheduleData, class: className } as ScheduleItem;
        });
        setSchedules(fetchedSchedules);

        const qPrograms = query(collection(db, 'teachingPrograms'), where('userId', '==', user.uid));
        const programSnapshot = await getDocs(qPrograms);
        const fetchedPrograms = programSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrograms(fetchedPrograms as ProgramItem[]);

        if (activeSemester) {
          const fetchedHolidays = await fetchHolidays(user);
          generateCalendarEvents(fetchedSchedules, fetchedPrograms as ProgramItem[], fetchedHolidays);
        }
      } else {
        setSchedules([]);
        setPrograms([]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(fetchData);
    return () => unsubscribe();
  }, [generateCalendarEvents, activeSemester, fetchHolidays, selectedTemplateId, teachingSchedulesCollectionRef]);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const handleAddSchedule = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    if (!day || !startTime || !endTime) {
      toast.error('Mohon lengkapi Hari, Jam Mulai, dan Jam Selesai.');
      setIsSubmitting(false);
      return;
    }

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

    if (!user) return;

    try {
      const scheduleData: SchedulePayload = {
        userId: user.uid,
        day,
        startPeriod: scheduleType === 'teaching' ? parseInt(startPeriod) : 0,
        endPeriod: scheduleType === 'teaching' ? parseInt(endPeriod) : 0,
        startTime,
        endTime,
        semester: activeSemester,
        academicYear: academicYear,
        templateId: selectedTemplateId,
        type: scheduleType,
      };

      if (scheduleType === 'teaching') {
        const subject = subjects.find(s => s.id === selectedSubject);
        const rombel = classes.find(c => c.id === selectedClass);
        scheduleData.subjectId = selectedSubject;
        scheduleData.subjectName = (subject?.name || '').trim();
        scheduleData.classId = selectedClass;
        scheduleData.className = rombel?.rombel || '';
        scheduleData.class = rombel?.rombel || '';
        scheduleData.subject = (subject?.name || '').trim();
        scheduleData.activityName = '';
      } else {
        scheduleData.activityName = activityName;
        scheduleData.subjectId = null;
        scheduleData.subjectName = '';
        scheduleData.subject = activityName;
        scheduleData.classId = selectedClass;

        const rombel = selectedClass ? classes.find(c => c.id === selectedClass) : null;
        scheduleData.className = rombel?.rombel || 'Umum';
        scheduleData.class = rombel?.rombel || 'Umum';
      }

      const docRef = await addDoc(teachingSchedulesCollectionRef, scheduleData);
      const addedSchedule = { ...scheduleData, id: docRef.id } as ScheduleItem;

      toast.success('Jadwal berhasil ditambahkan!');

      setSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules, addedSchedule];
        generateCalendarEvents(updatedSchedules, programs, holidays);
        return updatedSchedules;
      });

      setStartPeriod('');
      setEndPeriod('');
      setStartTime('');
      setEndTime('');

      if (scheduleType === 'non-teaching') {
        setActivityName('');
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
  }, [day, selectedClass, startPeriod, endPeriod, startTime, endTime, selectedSubject, generateCalendarEvents, scheduleType, activityName, subjects, classes, activeSemester, academicYear, teachingSchedulesCollectionRef, isSubmitting, selectedTemplateId, holidays, programs, user]);

  const handleCreateTemplate = () => {
    setNewTemplateName('');
    setIsTemplateModalOpen(true);
  };

  const handleConfirmCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !user) return;

    const templateName = newTemplateName.trim();
    setIsTemplateModalOpen(false);
    const toastId = toast.loading(`Membuat template '${templateName}'...`);

    try {
      const newTemplate = {
        userId: user.uid,
        name: templateName,
        isActive: false,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'scheduleTemplates'), newTemplate);
      const added = { id: docRef.id, ...newTemplate } as TemplateItem;
      setTemplates(prev => [...prev, added]);
      setSelectedTemplateId(docRef.id);
      toast.success(`Template '${templateName}' berhasil dibuat.`, { id: toastId });
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Gagal membuat template.", { id: toastId });
    }
  };

  const handleActivateTemplate = async (templateId: string | null) => {
    if (!user || !templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const toastId = toast.loading(`Mengaktifkan template ${template.name}...`);
    try {
      const batch = writeBatch(db);

      templates.forEach(t => {
        if (t.isActive) {
          batch.update(doc(db, 'scheduleTemplates', t.id), { isActive: false });
        }
      });

      batch.update(doc(db, 'scheduleTemplates', templateId), { isActive: true });

      batch.update(doc(db, 'users', user.uid), {
        activeTemplateId: templateId,
        activeTemplateName: template.name
      });

      await batch.commit();

      setTemplates(prev => prev.map(t => ({
        ...t,
        isActive: t.id === templateId
      })));

      toast.success(`Template ${template.name} sekarang aktif!`, { id: toastId });
    } catch (error) {
      console.error("Error activating template:", error);
      toast.error("Gagal mengaktifkan template.", { id: toastId });
    }
  };

  const handleDeleteTemplate = async (templateId: string | null) => {
    if (!user || !templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (template.isActive) {
      toast.error("Tidak dapat menghapus template yang sedang aktif.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Template?',
      message: `Seluruh jadwal di dalam template '${template.name}' akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        const toastId = toast.loading(`Menghapus template ${template.name}...`);
        try {
          const q = query(collection(db, 'teachingSchedules'), where('templateId', '==', templateId));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => batch.delete(d.ref));

          batch.delete(doc(db, 'scheduleTemplates', templateId));

          await batch.commit();

          setTemplates(prev => prev.filter(t => t.id !== templateId));
          if (selectedTemplateId === templateId) {
            setSelectedTemplateId(templates.find(t => t.isActive)?.id || templates[0]?.id || null);
          }

          toast.success(`Template ${template.name} berhasil dihapus.`, { id: toastId });
        } catch (error) {
          console.error("Error deleting template:", error);
          toast.error("Gagal menghapus template.", { id: toastId });
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Jadwal',
      message: 'Apakah Anda benar-benar yakin ingin menghapus jadwal mengajar ini?',
      onConfirm: async () => {
        try {
          const scheduleDoc = doc(db, 'teachingSchedules', id);
          await deleteDoc(scheduleDoc);
          toast.success('Jadwal berhasil dihapus!');

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

  const handleEditSchedule = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleSaveSchedule = () => {
    const getSchedules = async () => {
      if (user) {
        const q = query(
          teachingSchedulesCollectionRef,
          where('userId', '==', user.uid),
          where('templateId', '==', selectedTemplateId)
        );
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => {
          const scheduleData = doc.data();
          const className = typeof scheduleData.class === 'object' && scheduleData.class !== null
            ? scheduleData.class.rombel
            : scheduleData.class;
          return { id: doc.id, ...scheduleData, class: className } as ScheduleItem;
        });
        setSchedules(fetchedSchedules);
        if (activeSemester) {
          generateCalendarEvents(fetchedSchedules, programs, holidays);
        }
      } else {
        setSchedules([]);
      }
    };
    getSchedules();
    toast.success('Jadwal berhasil diperbarui!');
    handleCloseModal();
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = 'transparent';
    let borderStyle = 'solid';
    let color = 'white';

    if (event.resource?.isNonTeaching) {
      backgroundColor = '#FBCFE8';
      color = '#B91C4B';
      borderStyle = 'dashed';
      borderColor = '#B91C4B';
    } else if (event.isHoliday) {
      backgroundColor = '#EF4444';
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
      defaultDate: new Date(),
      scrollToTime: moment().toDate(),
    }),
    [],
  );

  return (
    <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-inner min-h-screen">
      {/* Template Management Section */}
      <div className="mb-6 p-4 md:p-6 card-glass rounded-3xl shadow-xl border border-blue-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 pointer-events-none">
          <CalendarIcon size={80} className="text-blue-500 md:w-[120px] md:h-[120px]" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
              <CalendarIcon className="text-blue-500" size={24} />
              <span className="bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent italic">Profil Jadwal</span>
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              {/* School Days Toggle */}
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-gray-700">
                <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest ml-2">Hari Sekolah:</span>
                <div className="flex card-glass rounded-lg overflow-hidden border border-blue-200 dark:border-gray-700 flex-1 md:flex-none">
                  <button
                    type="button"
                    onClick={() => handleSchoolDaysChange(5)}
                    className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold transition-all ${schoolDays === 5 ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
                  >
                    5 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSchoolDaysChange(6)}
                    className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold transition-all ${schoolDays === 6 ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
                  >
                    6 Hari
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-500/20 active:scale-95 text-sm"
              >
                <CalendarIcon size={18} />
                Kelola Agenda
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
            <div className="md:col-span-1 lg:col-span-2">
              <label className="block text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 underline decoration-blue-500/30">Pilih Struktur Jadwal:</label>
              <div className="flex gap-2">
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-2xl font-bold text-gray-700 dark:text-gray-200 focus:border-blue-500 outline-none transition-all shadow-inner text-sm md:text-base"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isActive ? '✓' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateTemplate}
                  className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 shrink-0"
                  title="Tambah Template Baru"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="md:col-span-1 lg:col-span-2 flex flex-row gap-2">
              <button
                onClick={() => handleActivateTemplate(selectedTemplateId)}
                disabled={!selectedTemplateId || templates.find(t => t.id === selectedTemplateId)?.isActive}
                className="flex-1 py-3 px-4 md:py-3.5 md:px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tighter text-[10px] md:text-xs"
              >
                <RefreshCw size={14} className={isLoadingTemplates ? 'animate-spin' : ''} />
                Terapkan Jadwal
              </button>

              <button
                onClick={() => handleDeleteTemplate(selectedTemplateId)}
                disabled={!selectedTemplateId || templates.find(t => t.id === selectedTemplateId)?.isActive}
                className="shrink-0 px-4 md:px-6 py-3 md:py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-500 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                title="Hapus Template"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-6 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full w-full sm:w-auto">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="truncate">Edit: {templates.find(t => t.id === selectedTemplateId)?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full w-full sm:w-auto">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="truncate">Aktif: {activeTemplateName || 'Jadwal Normal'}</span>
            </div>
            <div className="text-gray-400 sm:ml-auto w-full sm:w-auto text-center sm:text-right">
              {activeSemester} ({academicYear})
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleAddSchedule} className="space-y-4">
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
      </div>
      {isModalOpen && (
        <Modal title="Edit Jadwal" onClose={handleCloseModal}>
          <ScheduleEditor
            scheduleData={selectedSchedule! as ScheduleItem}
            onSave={handleSaveSchedule}
            onClose={handleCloseModal}
            subjects={subjects}
            classes={classes}
          />
        </Modal>
      )}

      {isHolidayModalOpen && (
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
                <h4 className="font-bold mb-2">
                  {editingHolidayId ? 'Edit Agenda / Libur' : 'Tambah Agenda / Libur Manual'}
                </h4>
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
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className={`flex-1 ${editingHolidayId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white p-2 rounded flex justify-center items-center gap-2 font-semibold transition-colors`}>
                      {editingHolidayId ? <RefreshCw size={18} /> : <Plus size={18} />}
                      {editingHolidayId ? 'Update Agenda' : 'Simpan Agenda'}
                    </button>
                    {editingHolidayId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHolidayId(null);
                          setNewHolidayDate('');
                          setNewHolidayEndDate('');
                          setNewHolidayDescription('');
                        }}
                        className="bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <h4 className="font-bold mb-2">Daftar Agenda Sekolah ({holidays.length})</h4>
            <div className="max-h-60 overflow-y-auto border rounded divide-y">
              {holidays.length === 0 ? (
                <p className="p-4 text-center text-gray-500 text-sm">Belum ada data libur.</p>
              ) : (
                holidays.sort((a, b) => new Date(a.date || a.startDate || '').getTime() - new Date(b.date || b.startDate || '').getTime()).map(h => (
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingHolidayId(h.id);
                          setNewHolidayDate(h.startDate || h.date || '');
                          setNewHolidayEndDate(h.endDate || h.date || '');
                          setNewHolidayCategory(h.category || 'lainnya');
                          setNewHolidayDescription(h.description || h.name);
                        }}
                        className="text-blue-500 hover:bg-blue-50 p-1 rounded"
                        title="Edit Agenda"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                        title="Hapus Agenda"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* New Template Modal */}
      {isTemplateModalOpen && (
        <Modal title="Buat Profil Jadwal Baru" onClose={() => setIsTemplateModalOpen(false)}>
          <form onSubmit={handleConfirmCreateTemplate} className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-black uppercase tracking-widest text-gray-400 mb-2">Nama Profil Jadwal:</label>
              <input
                type="text"
                autoFocus
                placeholder="Contoh: Jadwal Ramadan, Sesi Ujian..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-700 focus:border-blue-500 outline-none transition-all shadow-inner text-lg"
                required
              />
              <p className="mt-3 text-xs text-gray-500 font-medium leading-relaxed">
                Gunakan nama yang deskriptif untuk memudahkan Anda berpindah antar konfigurasi jadwal nantinya.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Buat Template
              </button>
            </div>
          </form>
        </Modal>
      )}

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
                onClick={confirmModal.onConfirm || undefined}
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
    </div>
  );
};

export default ScheduleInputMasterData;

