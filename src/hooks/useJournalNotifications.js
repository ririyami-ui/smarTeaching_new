import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useSettings } from '../utils/SettingsContext';

const useJournalNotifications = () => {
    const { activeSemester, academicYear, activeTemplateId } = useSettings();
    const [schedules, setSchedules] = useState([]);
    const [journals, setJournals] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !activeTemplateId) return;

            try {
                // Fetch Schedules
                const qS = query(
                    collection(db, 'teachingSchedules'),
                    where('userId', '==', user.uid),
                    where('templateId', '==', activeTemplateId)
                );
                const sSnap = await getDocs(qS);
                setSchedules(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Fetch Journals for this week
                const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
                const qJ = query(
                    collection(db, 'teachingJournals'),
                    where('userId', '==', user.uid),
                    where('date', '>=', startOfWeek),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );
                const jSnap = await getDocs(qJ);
                setJournals(jSnap.docs.map(doc => doc.data()));
            } catch (err) {
                console.error("[JournalNotification] Fetch error:", err);
            }
        };
        fetchData();
    }, [user, activeTemplateId, activeSemester, academicYear]);

    const [lastHash, setLastHash] = useState('');

    useEffect(() => {
        const scheduleJournalReminders = async () => {
            const currentHash = JSON.stringify(schedules) + JSON.stringify(journals);
            if (currentHash === lastHash) {
                await LocalNotifications.removeAllDeliveredNotifications();
                return;
            }

            try {
                await LocalNotifications.removeAllDeliveredNotifications();

                let permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    permStatus = await LocalNotifications.requestPermissions();
                    if (permStatus.display !== 'granted') return;
                }

                const pending = await LocalNotifications.getPending();
                const toCancel = pending.notifications.filter(n =>
                    n.id.toString().startsWith('7') || (n.extra && n.extra.type === 'journal_reminder')
                );

                if (toCancel.length > 0) {
                    await LocalNotifications.cancel({ notifications: toCancel });
                }

                if (schedules.length === 0) {
                    setLastHash(currentHash);
                    return;
                }

                const notificationsToSchedule = [];
                const daysMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
                const now = moment();

                schedules.forEach((sched, index) => {
                    if (sched.type === 'non-teaching' || !sched.endTime) return;
                    const dayIndex = daysMap[sched.day];
                    if (dayIndex === undefined) return;

                    // Focus on TODAY and FUTURE this week
                    let targetDate = moment().day(dayIndex);
                    // If the day has passed this week, we don't schedule for this week anymore
                    if (targetDate.isBefore(now, 'day')) return;

                    const dateStr = targetDate.format('YYYY-MM-DD');
                    const className = typeof sched.class === 'object' ? sched.class.rombel : (sched.className || sched.class);
                    const subjectName = sched.subjectName || sched.subject;

                    // Check if journal already exists
                    const exists = journals.find(j =>
                        j.date === dateStr &&
                        (j.className === className) &&
                        (j.subjectName === subjectName)
                    );

                    if (!exists) {
                        const [endHour, endMin] = sched.endTime.split(':').map(Number);
                        const reminderTime = targetDate.clone().hour(endHour).minute(endMin).add(15, 'minutes');

                        if (reminderTime.isAfter(now)) {
                            // ID Format: 7 + Day(1) + Hour(2) + Minute(2) + Index(2)
                            const idString = `7${dayIndex}${endHour.toString().padStart(2, '0')}${endMin.toString().padStart(2, '0')}${index.toString().padStart(2, '0')}`;

                            notificationsToSchedule.push({
                                id: parseInt(idString.substring(0, 9)),
                                title: 'Jurnal Belum Terisi',
                                body: `Pelajaran ${subjectName} di ${className} sudah selesai. Yuk isi jurnalnya sekarang!`,
                                schedule: { at: reminderTime.toDate() },
                                extra: {
                                    type: 'journal_reminder',
                                    date: dateStr,
                                    classId: className,
                                    subjectId: subjectName
                                }
                            });
                        }
                    }
                });

                if (notificationsToSchedule.length > 0) {
                    await LocalNotifications.schedule({ notifications: notificationsToSchedule });

                }
                setLastHash(currentHash);
            } catch (err) {
                console.error("[JournalEngine] Error:", err);
            }
        };

        scheduleJournalReminders();
    }, [schedules, journals, lastHash]);

    return null;
};

export default useJournalNotifications;
