import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { LocalNotifications } from '@capacitor/local-notifications';

const useScheduleNotifications = () => {
  const [schedules, setSchedules] = useState([]);
  const [user, setUser] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch schedules when user changes
  useEffect(() => {
    const fetchSchedules = async () => {
      if (user) {
        const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');
        const q = query(
          teachingSchedulesCollectionRef,
          where('userId', '==', user.uid)
        );
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setSchedules(fetchedSchedules);
      } else {
        setSchedules([]);
      }
    };
    fetchSchedules();
  }, [user]);

  // Schedule notifications when schedules change
  useEffect(() => {
    const scheduleNotifications = async () => {
      if (schedules.length === 0) return;

      // Request notification permissions
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display !== 'granted') {
          console.warn('Notification permissions not granted.');
          return;
        }
      }

      // Clear any previously scheduled notifications to avoid duplicates
      await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });

      const notificationsToSchedule = [];
      const today = moment();
      const daysMap = {
        'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 0
      };

      schedules.forEach((schedule, index) => {
        const dayOfWeek = daysMap[schedule.day];
        if (dayOfWeek === undefined) return; // Skip if day is not recognized

        // Calculate next occurrence of this day
        let nextOccurrence = moment().day(dayOfWeek);
        if (nextOccurrence.isBefore(today, 'day')) {
          nextOccurrence.add(1, 'week'); // If day has passed this week, schedule for next week
        }

        // Set time for 5 minutes before start time
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const notificationTime = nextOccurrence
          .hour(startHour)
          .minute(startMinute)
          .second(0)
          .subtract(5, 'minutes');

        // Only schedule if the notification time is in the future
        if (notificationTime.isAfter(moment())) {
          const displayClass = typeof schedule.class === 'object' && schedule.class !== null
            ? schedule.class.rombel
            : schedule.class;

          notificationsToSchedule.push({
            id: parseInt(`${dayOfWeek}${startHour}${startMinute}${index}`), // Unique ID for notification
            title: 'Jadwal Mengajar Segera Dimulai!',
            body: `${schedule.subject} Kelas ${displayClass} akan dimulai dalam 5 menit.`,
            schedule: { at: notificationTime.toDate() },
            sound: null, // Use default sound
            attachments: null,
            actionTypeId: '',
            extra: {
              scheduleId: schedule.id,
              subject: schedule.subject,
              class: displayClass,
            },
          });
        }
      });

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Scheduled ${notificationsToSchedule.length} notifications.`);
      }
    };

    scheduleNotifications();
    // Re-schedule daily to catch new schedules or for next week's occurrences
    const interval = setInterval(scheduleNotifications, 24 * 60 * 60 * 1000); // Run once every 24 hours
    return () => clearInterval(interval);
  }, [schedules]); // Re-run when schedules change

  return null; // This hook doesn't render anything
};

export default useScheduleNotifications;
