import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { LocalNotifications } from '@capacitor/local-notifications';

const useTaskNotifications = (activeSemester, academicYear) => {
    const [tasks, setTasks] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchTasks = async () => {
            if (user) {
                const q = query(
                    collection(db, 'studentTasks'),
                    where('userId', '==', user.uid),
                    where('status', '==', 'Pending'),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );
                const data = await getDocs(q);
                setTasks(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
            } else {
                setTasks([]);
            }
        };
        fetchTasks();
    }, [user, activeSemester, academicYear]);

    const [lastTasksHash, setLastTasksHash] = useState('');

    useEffect(() => {
        const scheduleTaskNotifications = async () => {
            const currentHash = JSON.stringify(tasks);
            if (currentHash === lastTasksHash) {
                await LocalNotifications.removeAllDeliveredNotifications();
                return;
            }

            try {
                // Aggressive cleanup
                await LocalNotifications.removeAllDeliveredNotifications();

                let permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    permStatus = await LocalNotifications.requestPermissions();
                    if (permStatus.display !== 'granted') return;
                }

                const pending = await LocalNotifications.getPending();
                const taskNotificationsToCancel = pending.notifications.filter(n =>
                    n.id.toString().startsWith('9') || (n.extra && n.extra.type === 'task')
                );

                if (taskNotificationsToCancel.length > 0) {
                    await LocalNotifications.cancel({ notifications: taskNotificationsToCancel });
                }

                if (tasks.length === 0) {
                    setLastTasksHash(currentHash);
                    return;
                }

                const notificationsToSchedule = [];
                const now = moment();

                tasks.forEach((task) => {
                    if (!task.deadline || !task.deadline.toDate) return;

                    const deadline = moment(task.deadline.toDate()).startOf('day').hour(8); // Remind at 8 AM

                    if (deadline.isAfter(now)) {
                        let hash = 0;
                        for (let i = 0; i < task.id.length; i++) {
                            hash = ((hash << 5) - hash) + task.id.charCodeAt(i);
                            hash |= 0;
                        }
                        const uniqueIdSuffix = Math.abs(hash) % 1000000;
                        const id = 90000000 + uniqueIdSuffix;

                        notificationsToSchedule.push({
                            id: id,
                            title: 'Peringatan Tugas',
                            body: `Batas waktu "${task.title}" berakhir hari ini.`,
                            schedule: { at: deadline.toDate() },
                            extra: { type: 'task' }
                        });
                    }
                });

                if (notificationsToSchedule.length > 0) {
                    await LocalNotifications.schedule({ notifications: notificationsToSchedule });

                    setLastTasksHash(currentHash);
                }
            } catch (err) {
                console.error("[TaskEngine] Error:", err);
            }
        };

        scheduleTaskNotifications();
    }, [tasks, lastTasksHash]);

    return null;
};

export default useTaskNotifications;
