import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { Book, Users, Clock, Zap, X, ExternalLink } from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import { getTopicForSchedule } from '../utils/topicUtils';

export default function JadwalPage() {
  const { activeSemester, academicYear } = useSettings();
  const [schedules, setSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null); // State for popup
  const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');
  const teachingProgramsCollectionRef = collection(db, 'teachingPrograms');
  const classesCollectionRef = collection(db, 'classes');

  // Fetch schedules, programs, and classes from Firestore
  useEffect(() => {
    const fetchData = async (user) => {
      if (user) {
        const [qSchedules, qPrograms, qClasses] = await Promise.all([
          getDocs(query(teachingSchedulesCollectionRef, where('userId', '==', user.uid))),
          getDocs(query(teachingProgramsCollectionRef, where('userId', '==', user.uid))),
          getDocs(query(classesCollectionRef, where('userId', '==', user.uid)))
        ]);

        setSchedules(qSchedules.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setPrograms(qPrograms.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setClasses(qClasses.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } else {
        setSchedules([]);
        setPrograms([]);
        setClasses([]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(fetchData);
    return () => unsubscribe();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedTopic) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedTopic]);

  // Group schedules by day of the week
  const groupedSchedules = schedules
    .filter(schedule => schedule.type !== 'non-teaching')
    .reduce((acc, schedule) => {
      if (!acc[schedule.day]) acc[schedule.day] = [];
      acc[schedule.day].push(schedule);
      return acc;
    }, {});

  // Sort by start time
  Object.keys(groupedSchedules).forEach(day => {
    groupedSchedules[day].sort((a, b) => moment(a.startTime, 'HH:mm').diff(moment(b.startTime, 'HH:mm')));
  });

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const getDayDate = (dayName) => {
    const today = moment();
    const momentDayIndex = daysOrder.indexOf(dayName) + 1;
    let targetDay = moment().day(momentDayIndex);
    if (targetDay.isBefore(today, 'day')) targetDay = targetDay.add(1, 'week');
    return targetDay;
  };

  const dayColors = {
    'Senin': 'bg-blue-500',
    'Selasa': 'bg-green-500',
    'Rabu': 'bg-yellow-500',
    'Kamis': 'bg-red-500',
    'Jumat': 'bg-purple-500',
    'Sabtu': 'bg-pink-500',
    'Minggu': 'bg-gray-500',
  };

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg dark:bg-gray-800">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Jadwal Mengajar</h2>
      <p className="text-sm sm:text-lg font-medium text-gray-700 dark:text-gray-200 mb-6">
        Semester: {activeSemester} (Tahun Ajaran {academicYear})
      </p>

      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar yang tersedia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {daysOrder.map(day => groupedSchedules[day] && (
            <div key={day} className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className={`p-4 ${dayColors[day] || 'bg-indigo-500'}`}>
                <h3 className="text-xl font-bold text-white text-center">{day}</h3>
                <p className="text-sm text-white text-center">{getDayDate(day).format('DD MMMM YYYY')}</p>
              </div>
              <ul className="p-4 space-y-3">
                {groupedSchedules[day].map((schedule, index) => {
                  const displayClass = typeof schedule.class === 'object' && schedule.class !== null
                    ? schedule.class.rombel
                    : schedule.class;
                  const classInfo = classes.find(c => (c.rombel || '').trim().toUpperCase() === (displayClass || '').trim().toUpperCase());
                  const scheduleGrade = classInfo?.level || displayClass?.match(/\d+/)?.[0] || '';
                  const topic = getTopicForSchedule(schedule, getDayDate(day), programs, classes, activeSemester, academicYear);
                  return (
                    <li key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center mb-1">
                        <Book className="w-5 h-5 mr-2 text-indigo-500" />
                        <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">{schedule.subject}</p>
                      </div>

                      {topic && (
                        <div className="ml-7 mb-2">
                          <p className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 uppercase tracking-wider mb-1 opacity-80">
                            <Zap size={10} fill="currentColor" /> Rencana Promes
                          </p>
                          <div
                            onClick={() => setSelectedTopic({ subject: schedule.subject, topic: topic, grade: scheduleGrade })}
                            className="cursor-pointer group relative text-[11px] text-gray-700 dark:text-gray-300 leading-snug bg-green-50/50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100/50 dark:border-green-800/30 hover:bg-green-100/50 dark:hover:bg-green-900/20 hover:border-green-300 transition-all shadow-sm active:scale-[0.98]"
                          >
                            <p className="line-clamp-2 italic">{topic}</p>
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink size={10} className="text-green-600" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center mb-2">
                        <Users className="w-5 h-5 mr-2 text-gray-500" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Kelas: {displayClass}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-5 h-5 mr-2" />
                        <span>Jam ke: {schedule.startPeriod}-{schedule.endPeriod}</span>
                        <span className="mx-2">|</span>
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal - Portal escapes parent transforms/scrolling */}
      {selectedTopic && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 no-print"
          onClick={() => setSelectedTopic(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50/30 dark:bg-green-900/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Book size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight text-base">Detail Materi</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-medium">{selectedTopic.subject}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Tutup"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTopic.topic}
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                to={`/rpp?grade=${selectedTopic.grade}&subject=${encodeURIComponent(selectedTopic.subject)}&topic=${encodeURIComponent(selectedTopic.topic)}`}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
                onClick={() => {
                  setSelectedTopic(null);
                  document.body.style.overflow = 'unset';
                }}
              >
                <Zap size={16} fill="white" className="group-hover:animate-pulse" />
                Buat RPP
              </Link>
              <Link
                to={`/handout-generator?grade=${selectedTopic.grade}&subject=${encodeURIComponent(selectedTopic.subject)}&topic=${encodeURIComponent(selectedTopic.topic)}`}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 group"
                onClick={() => {
                  setSelectedTopic(null);
                  document.body.style.overflow = 'unset';
                }}
              >
                <Book size={16} className="group-hover:scale-110 transition-transform" />
                Buat Bahan Ajar
              </Link>
              <button
                onClick={() => setSelectedTopic(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
