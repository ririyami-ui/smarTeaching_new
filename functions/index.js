const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/*
exports.scheduleNotification = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const fiveMinutesLater = admin.firestore.Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);

    // Get today's date in YYYY-MM-DD format for comparison
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`;

    try {
        const schedulesRef = db.collection('teachingSchedules');
        const querySnapshot = await schedulesRef
            .where('date', '==', todayDateString) // Assuming 'date' field stores YYYY-MM-DD string
            .get();

        querySnapshot.forEach(async (doc) => {
            const schedule = doc.data();
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);

            // Create a Date object for the schedule's start time today
            const scheduleStartTime = new Date(year, today.getMonth(), day, startHour, startMinute, 0);
            const scheduleStartTimestamp = admin.firestore.Timestamp.fromDate(scheduleStartTime);

            // Check if the schedule is within the next 5 minutes
            if (scheduleStartTimestamp.toMillis() > now.toMillis() && scheduleStartTimestamp.toMillis() <= fiveMinutesLater.toMillis()) {
                console.log(`Scheduling notification for subject: ${schedule.subject} at ${schedule.startTime}`);

                // Fetch user's FCM token (assuming it's stored in a 'users' collection)
                // You need to decide how to link schedules to users.
                // For simplicity, let's assume schedule has a 'userId' field.
                const userDoc = await db.collection('users').doc(schedule.userId).get();
                const userData = userDoc.data();

                if (userData && userData.fcmToken) {
                    const message = {
                        notification: {
                            title: 'Pengingat Pembelajaran',
                            body: `Pembelajaran ${schedule.subject} akan dimulai dalam 5 menit pada pukul ${schedule.startTime}.`,
                        },
                        token: userData.fcmToken,
                    };

                    try {
                        await admin.messaging().send(message);
                        console.log('Notification sent successfully:', schedule.subject);
                    } catch (error) {
                        console.error('Error sending notification:', error);
                    }
                } else {
                    console.log(`No FCM token found for user ${schedule.userId} or user not found.`);
                }
            }
        });
        return null;
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return null;
    }
});
*/
