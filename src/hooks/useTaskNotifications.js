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

    useEffect(() => {
        const scheduleTaskNotifications = async () => {
            // Even if tasks is empty, we must run this to CLEAR old notifications for completed tasks

            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                permStatus = await LocalNotifications.requestPermissions();
                if (permStatus.display !== 'granted') return;
            }

            // 1. Get ALL pending notifications
            const pending = await LocalNotifications.getPending();

            // 2. Identify which ones are "Task" notifications (ID starts with '9')
            // This is crucial: we MUST clean up old task notifications before setting new ones
            // because if a task is completed, it won't be in the `tasks` array anymore,
            // so we need to remove its potential notification.
            const taskNotificationsToCancel = pending.notifications.filter(n => n.id.toString().startsWith('9'));

            // 3. Cancel ONLY those
            if (taskNotificationsToCancel.length > 0) {
                await LocalNotifications.cancel({ notifications: taskNotificationsToCancel });
                console.log(`Cancelled ${taskNotificationsToCancel.length} old task notifications.`);
            }

            if (tasks.length === 0) return;

            const notificationsToSchedule = [];
            const now = moment();

            tasks.forEach((task, index) => {
                // SAFETY CHECK: Ensure deadline is a valid Timestamp
                if (!task.deadline || !task.deadline.toDate) {
                    console.warn(`Task "${task.title}" has invalid deadline, skipping notification`);
                    return;
                }

                const deadline = moment(task.deadline.toDate()).startOf('day').hour(8); // Remind at 8 AM

                if (deadline.isAfter(now)) {
                    // Generate a unique numeric ID for the notification
                    // Prefix with '9' to distinguish from Schedule notifications
                    const idStr = task.id.substring(0, 8);
                    // Ensure it starts with 9 and is 9 digits max for safety (though int32 limit is 2B)
                    // We use 90000000 base + (some hash of ID)
                    // Simplified: Use simple hash of ID string to get a number
                    let hash = 0;
                    for (let i = 0; i < task.id.length; i++) {
                        hash = ((hash << 5) - hash) + task.id.charCodeAt(i);
                        hash |= 0; // Convert to 32bit integer
                    }
                    const uniqueIdSuffix = Math.abs(hash) % 1000000;
                    const id = 90000000 + uniqueIdSuffix;

                    notificationsToSchedule.push({
                        id: id,
                        title: 'Batas Waktu Tugas Hari Ini!',
                        body: `Tugas "${task.title}" kelas ${task.className} berakhir hari ini.`,
                        schedule: { at: deadline.toDate() },
                        sound: null,
                        extra: { taskId: task.id, type: 'task' }
                    });
                }
            });

            if (notificationsToSchedule.length > 0) {
                await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                console.log(`Scheduled ${notificationsToSchedule.length} task notifications.`);
            }
        };

        scheduleTaskNotifications();
    }, [tasks]);

    return null;
};

export default useTaskNotifications;
