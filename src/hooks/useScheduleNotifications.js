import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useSettings } from '../utils/SettingsContext';

const useScheduleNotifications = () => {
  const { scheduleNotificationsEnabled } = useSettings();
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

  useEffect(() => {
    const scheduleNotifications = async () => {
      if (!scheduleNotificationsEnabled) {
        // If disabled, we still need to clear existing schedule notifications
        // Getting pending notifications
        const pending = await LocalNotifications.getPending();
        // Filter for schedule notifications (IDs starting with '1')
        const scheduleNotificationsToCancel = pending.notifications.filter(n => n.id.toString().startsWith('1'));

        if (scheduleNotificationsToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: scheduleNotificationsToCancel });
          console.log(`Cancelled ${scheduleNotificationsToCancel.length} disabled schedule notifications.`);
        }
        return;
      }

      // Request notification permissions
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display !== 'granted') {
          console.warn('Notification permissions not granted.');
          return;
        }
      }

      // 1. Get ALL pending notifications
      const pending = await LocalNotifications.getPending();

      // 2. Identify which ones are "Schedule" notifications (ID starts with '1')
      const scheduleNotificationsToCancel = pending.notifications.filter(n => n.id.toString().startsWith('1'));

      // 3. Cancel ONLY those
      if (scheduleNotificationsToCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: scheduleNotificationsToCancel });
      }

      const notificationsToSchedule = [];
      const today = moment();
      const daysMap = {
        'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 0
      };

      schedules.forEach((schedule, index) => {
        const dayOfWeek = daysMap[schedule.day];
        if (dayOfWeek === undefined) return; // Skip if day is not recognized

        // SAFETY CHECK: Ensure startTime is valid
        if (!schedule.startTime || typeof schedule.startTime !== 'string' || !schedule.startTime.includes(':')) {
          console.warn(`Schedule for ${schedule.subject} has invalid startTime, skipping notification`);
          return;
        }

        // Calculate next occurrence of this day
        // Set time for 5 minutes before start time
        let [startHour, startMinute] = schedule.startTime.split(':').map(Number);

        // Subtract 5 minutes for reminder
        startMinute -= 5;
        if (startMinute < 0) {
          startMinute += 60;
          startHour -= 1;
        }
        if (startHour < 0) startHour += 24;

        // Validate parsed time
        if (isNaN(startHour) || isNaN(startMinute)) {
          console.warn(`Schedule for ${schedule.subject} has invalid time format, skipping notification`);
          return;
        }

        const displayClass = typeof schedule.class === 'object' && schedule.class !== null
          ? schedule.class.rombel
          : schedule.class;

        // Use a prefix '1' for Schedule notifications to distinguish from Tasks (which use '9')
        // ID Format: 1 + Day(1) + Hour(2) + Minute(2) + Index(2) -> 8 digits
        // Example: 1 1 07 25 01 (Monday, 07:25, 2nd schedule)
        const idString = `1${dayOfWeek}${startHour.toString().padStart(2, '0')}${startMinute.toString().padStart(2, '0')}${index.toString().padStart(2, '0')}`;

        notificationsToSchedule.push({
          id: parseInt(idString.substring(0, 9)),
          title: 'Jadwal Mengajar Segera Dimulai!',
          body: `${schedule.subject} di Kelas ${displayClass} akan dimulai dalam 5 menit.`,
          schedule: {
            on: {
              weekday: dayOfWeek,
              hour: startHour,
              minute: startMinute
            },
            repeats: true,
            allowWhileIdle: true
          },
          sound: null,
          extra: {
            scheduleId: schedule.id,
            subject: schedule.subject,
            class: displayClass,
            type: 'schedule' // Mark type for easier debugging if needed
          },
        });
      });

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Re-scheduled ${notificationsToSchedule.length} class notifications.`);
      }
    };

    scheduleNotifications();

    // Re-schedule daily to ensure consistency
    const interval = setInterval(scheduleNotifications, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [schedules, scheduleNotificationsEnabled]);

  return null; // This hook doesn't render anything
};

export default useScheduleNotifications;
