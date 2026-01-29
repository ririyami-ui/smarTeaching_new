import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, CheckCircle, ChevronRight, BookX } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

const JournalReminder = ({ user, activeSemester, academicYear, onUpdateMissingCount }) => {
    const [missingJournals, setMissingJournals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkMissingJournals = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                // 1. Get Teaching Schedule (Routine)
                const scheduleQuery = query(collection(db, 'teachingSchedules'), where('userId', '==', user.uid));
                const scheduleSnap = await getDocs(scheduleQuery);
                const schedules = scheduleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (schedules.length === 0) {
                    setMissingJournals([]);
                    if (onUpdateMissingCount) onUpdateMissingCount(0);
                    setIsLoading(false);
                    return;
                }

                // 2. Get Journals from last 7 days from DB to compare
                // We can't query "NOT IN" easily for complex dates, so we fetch relevant journals and filter in JS
                const today = moment().endOf('day');
                const sevenDaysAgo = moment().subtract(6, 'days').startOf('day'); // Include today + 6 previous days = 7 days window
                const sevenDaysAgoDate = sevenDaysAgo.format('YYYY-MM-DD');

                const journalsQuery = query(
                    collection(db, 'teachingJournals'),
                    where('userId', '==', user.uid),
                    where('date', '>=', sevenDaysAgoDate),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );

                const journalsSnap = await getDocs(journalsQuery);
                // Map as "YYYY-MM-DD_ClassName_SubjectName" for easy lookup
                // We use a normalized string (lowercase, trimmed) to avoid mismatch
                const journalKeys = new Set(journalsSnap.docs.map(doc => {
                    const data = doc.data();
                    const date = data.date || '';
                    const className = (data.className || data.class || data.rombel || '').toString().trim().toLowerCase();
                    const subjectName = (data.subjectName || data.subject || '').toString().trim().toLowerCase();
                    return `${date}_${className}_${subjectName}`;
                }));

                const missing = [];

                // 3. Iterate 7 days back
                for (let i = 0; i < 7; i++) {
                    const checkDate = moment().subtract(i, 'days');

                    // Skip future dates
                    if (checkDate.isAfter(today)) continue;

                    const dayNameIndex = checkDate.day(); // 0-6
                    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const dayNameIndo = dayNames[dayNameIndex];

                    // Filter schedules for this day name
                    // RELAXED: If type is missing, we assume it's "teaching" for backward compatibility
                    const daySchedules = schedules.filter(s => s.day === dayNameIndo && (s.type === 'teaching' || !s.type));

                    for (const sched of daySchedules) {
                        const originalClassName = typeof sched.class === 'object' ? sched.class.rombel : (sched.className || sched.class);
                        const originalSubject = sched.subjectName || sched.subject;

                        const normClassName = (originalClassName || '').toString().trim().toLowerCase();
                        const normSubject = (originalSubject || '').toString().trim().toLowerCase();
                        const dateStr = checkDate.format('YYYY-MM-DD');

                        const journalKey = `${dateStr}_${normClassName}_${normSubject}`;

                        if (!journalKeys.has(journalKey)) {
                            // For TODAY ONLY: Check if we're within 10 minutes of class ending
                            const isToday = checkDate.isSame(moment(), 'day');

                            if (isToday && sched.endTime) {
                                // Parse end time and calculate threshold (10 minutes before end)
                                const todayStr = moment().format('YYYY-MM-DD');
                                const classEndTime = moment(`${todayStr} ${sched.endTime}`, 'YYYY-MM-DD HH:mm');
                                const thresholdTime = classEndTime.isValid() ? classEndTime.clone().subtract(10, 'minutes') : null;
                                const now = moment();

                                // Only add to missing if current time >= threshold (within 10 min of ending or already ended)
                                if (thresholdTime && now.isBefore(thresholdTime)) {
                                    // Too early to remind, skip this schedule
                                    continue;
                                }
                            }

                            // Add to missing journals
                            missing.push({
                                date: dateStr,
                                formattedDate: checkDate.format('dddd, DD MMM'),
                                className: originalClassName,
                                subject: originalSubject,
                                time: sched.startTime
                            });
                        }
                    }
                }

                // Sort: Newest (top) usually better visibility
                missing.sort((a, b) => moment(b.date).diff(moment(a.date)));

                setMissingJournals(missing);
                if (onUpdateMissingCount) onUpdateMissingCount(missing.length);

            } catch (error) {
                console.error("Error checking missing journals:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkMissingJournals();
    }, [user, activeSemester, academicYear]);

    // If no missing journals, show nothing or a small success badge? 
    // User requested "Reminder if NOT filled". So if empty, maybe hidden or success state.
    // Let's show nothing if clean to reduce cognitive load, or a small green cheer if user likes gamification. We'll stick to Alert for now.

    if (isLoading) return null;

    if (missingJournals.length === 0) return null;

    return (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-800/30 rounded-xl shrink-0 text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                            Wah, ada {missingJournals.length} Jurnal Belum Terisi!
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Yuk lengkapi administrasi mengajar Anda agar rekapitulasi akhir semester aman.
                        </p>

                        <div className="space-y-2">
                            {missingJournals.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 bg-white/50 dark:bg-black/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <BookX size={14} className="shrink-0" />
                                    <span>{item.formattedDate}</span>
                                    <span className="opacity-50 md:inline hidden">•</span>
                                    <span className="bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded textxs uppercase tracking-wider">{item.className}</span>
                                    <span>{item.subject}</span>
                                </div>
                            ))}
                            {missingJournals.length > 3 && (
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-500 pl-1">
                                    ...dan {missingJournals.length - 3} lainnya.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <Link
                    to="/jurnal"
                    className="hidden sm:flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-800 hover:underline mt-1"
                >
                    Lengkapi Sekarang <ChevronRight size={16} />
                </Link>
            </div>
            <Link
                to="/jurnal"
                className="sm:hidden flex w-full justify-center items-center gap-2 mt-4 bg-amber-500 text-white py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
                Lengkapi Jurnal <ChevronRight size={16} />
            </Link>
        </div>
    );
};

export default JournalReminder;
