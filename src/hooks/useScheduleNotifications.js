import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useSettings } from '../utils/SettingsContext';

const useScheduleNotifications = () => {
  const { scheduleNotificationsEnabled, activeTemplateId } = useSettings();
  const [schedules, setSchedules] = useState([]);
  const [user, setUser] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch schedules when user or template changes
  useEffect(() => {
    const fetchSchedules = async () => {
      if (user && activeTemplateId) {
        const teachingSchedulesCollectionRef = collection(db, 'teachingSchedules');
        const q = query(
          teachingSchedulesCollectionRef,
          where('userId', '==', user.uid),
          where('templateId', '==', activeTemplateId)
        );
        const data = await getDocs(q);
        const fetchedSchedules = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setSchedules(fetchedSchedules);
      } else {
        setSchedules([]);
      }
    };
    fetchSchedules();
  }, [user, activeTemplateId]);

  const [lastScheduledHash, setLastScheduledHash] = useState('');

  useEffect(() => {
    const scheduleNotifications = async () => {
      if (!scheduleNotificationsEnabled) {
        const pending = await LocalNotifications.getPending();
        const scheduleNotificationsToCancel = pending.notifications.filter(n => n.id.toString().startsWith('1'));

        if (scheduleNotificationsToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: scheduleNotificationsToCancel });

        }
        return;
      }

      // 1. DEDUPLICATION: Avoid re-scheduling if nothing changed
      const currentHash = JSON.stringify(schedules);
      if (currentHash === lastScheduledHash) {
        // Just clear delivered ones to keep the tray clean
        await LocalNotifications.removeAllDeliveredNotifications();
        return;
      }

      try {
        // 2. AGGRESSIVE CLEANUP: Clear all old and delivered notifications
        await LocalNotifications.removeAllDeliveredNotifications();

        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          permStatus = await LocalNotifications.requestPermissions();
          if (permStatus.display !== 'granted') return;
        }

        // 3. CANCEL EXISTING: Remove all previously scheduled teaching notifications
        const pending = await LocalNotifications.getPending();
        const existingToCancel = pending.notifications.filter(n =>
          n.id.toString().startsWith('1') || (n.extra && n.extra.type === 'schedule')
        );

        if (existingToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: existingToCancel });
        }

        if (schedules.length === 0) {
          setLastScheduledHash(currentHash);
          return;
        }

        const notificationsToSchedule = [];
        const daysMap = { 'Minggu': 1, 'Senin': 2, 'Selasa': 3, 'Rabu': 4, 'Kamis': 5, 'Jumat': 6, 'Sabtu': 7 };

        schedules.forEach((schedule, index) => {
          const dayOfWeek = daysMap[schedule.day];
          if (dayOfWeek === undefined || !schedule.startTime) return;

          let [startHour, startMinute] = schedule.startTime.split(':').map(Number);
          startMinute -= 10; // Reminder 10 mins before (more professional)
          if (startMinute < 0) {
            startMinute += 60;
            startHour -= 1;
          }
          if (startHour < 0) startHour += 24;

          const displayClass = typeof schedule.class === 'object' ? schedule.class.rombel : schedule.class;

          // ID Format: 1 + Day(1) + Hour(2) + Minute(2) + Index(2)
          const idString = `1${dayOfWeek}${startHour.toString().padStart(2, '0')}${startMinute.toString().padStart(2, '0')}${index.toString().padStart(2, '0')}`;

          notificationsToSchedule.push({
            id: parseInt(idString.substring(0, 9)),
            title: 'Persiapan Mengajar',
            body: `${schedule.subject} di ${displayClass} dimulai dalam 10 menit.`,
            schedule: {
              on: { weekday: dayOfWeek, hour: startHour, minute: startMinute },
              repeats: true,
              allowWhileIdle: true
            },
            extra: { type: 'schedule' },
            smallIcon: 'res://pwa_icon', // Android specific if assets prepared
          });
        });

        if (notificationsToSchedule.length > 0) {
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });

          setLastScheduledHash(currentHash);
        }
      } catch (err) {
        console.error("[NotificationEngine] Error:", err);
      }
    };

    scheduleNotifications();
  }, [schedules, scheduleNotificationsEnabled, lastScheduledHash]);

  return null; // This hook doesn't render anything
};

export default useScheduleNotifications;
