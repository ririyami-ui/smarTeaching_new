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
            if (tasks.length === 0) return;

            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                permStatus = await LocalNotifications.requestPermissions();
                if (permStatus.display !== 'granted') return;
            }

            // We don't want to clear all notifications because useScheduleNotifications might have some
            // Instead, we should probably follow a naming convention or track them
            // For now, let's just schedule future ones and rely on Capacitor's override if IDs match
            // A better way would be using specific channel IDs or tags if supported, 
            // but let's just use unique ID prefix for Tasks (e.g. starts with 9)

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
                    // Using hash or similar to make it stable
                    const idStr = task.id.substring(0, 8);
                    const id = parseInt(idStr, 16) % 1000000 + 9000000; // 9xxxxxx range for tasks

                    notificationsToSchedule.push({
                        id: id,
                        title: 'Batas Waktu Tugas Hari Ini!',
                        body: `Tugas "${task.title}" kelas ${task.className} berakhir hari ini.`,
                        schedule: { at: deadline.toDate() },
                        sound: null,
                        extra: { taskId: task.id }
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
