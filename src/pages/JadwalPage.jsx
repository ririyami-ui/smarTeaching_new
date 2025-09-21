import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Added query, where
import { db, auth } from '../firebase'; // Added auth
import moment from 'moment';
import { Book, Users, Clock } from 'lucide-react';

export default function JadwalPage() {
  const [schedules, setSchedules] = useState([]);
  const [currentSemester, setCurrentSemester] = useState('');
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

  // Fetch schedules (recurrence rules) from Firestore on component mount
  useEffect(() => {
    const getSchedules = async (user) => {
      if (user) { // Only fetch if user is authenticated
        const q = query(
          teachingSchedulesCollectionRef,
          where('userId', '==', user.uid)
        );
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setSchedules(fetchedSchedules);
      } else {
        setSchedules([]); // Clear schedules if user logs out
      }
    };

    const unsubscribe = auth.onAuthStateChanged(getSchedules);
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // Group schedules by day of the week
  const groupedSchedules = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.day]) {
      acc[schedule.day] = [];
    }
    acc[schedule.day].push(schedule);
    return acc;
  }, {});

  // Sort schedules within each day by start time
  Object.keys(groupedSchedules).forEach(day => {
    groupedSchedules[day].sort((a, b) => {
      const timeA = moment(a.startTime, 'HH:mm');
      const timeB = moment(b.startTime, 'HH:mm');
      return timeA.diff(timeB);
    });
  });

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Jadwal Mengajar</h2>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-6">
        Semester: {currentSemester} ({moment().year()})
      </p>

      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar yang tersedia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {daysOrder.map(day => groupedSchedules[day] && (
            <div key={day} className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-4 bg-indigo-500">
                <h3 className="text-xl font-bold text-white text-center">{day}</h3>
              </div>
              <ul className="p-4 space-y-3">
                {groupedSchedules[day].map((schedule, index) => {
                  const displayClass = typeof schedule.class === 'object' && schedule.class !== null
                    ? schedule.class.rombel
                    : schedule.class;
                  return (
                    <li key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center mb-2">
                        <Book className="w-5 h-5 mr-2 text-indigo-500" />
                        <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">{schedule.subject}</p>
                      </div>
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
    </div>
  );
}
