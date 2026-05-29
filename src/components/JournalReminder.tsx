import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, ChevronRight, BookX } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/id';
import { indonesianHolidays } from '../utils/holidayData';
import type { User } from 'firebase/auth';

moment.locale('id');

interface MissingJournal {
  date: string;
  formattedDate: string;
  className: string;
  subject: string;
  time?: string;
}

interface ScheduleDoc {
  day: string;
  type?: string;
  class?: Record<string, unknown> | string;
  className?: string;
  subject?: string;
  subjectName?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

interface JournalReminderProps {
  user: User | Record<string, unknown> | null;
  activeSemester: string;
  academicYear: string;
  activeTemplateId: string;
  onUpdateMissingCount?: (count: number) => void;
}

const JournalReminder = ({ user, activeSemester, academicYear, activeTemplateId, onUpdateMissingCount }: JournalReminderProps) => {
  const [missingJournals, setMissingJournals] = useState<MissingJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMissingJournals = async () => {
      if (!user || !activeTemplateId) return;

      setIsLoading(true);
      try {
        // 0. Build Holiday Date Set (Firestore + static holidays)
        const holidayDates = new Set<string>();

        // Fetch from Firestore holidays collection
        try {
          const holidaysQuery = query(collection(db, 'holidays'), where('userId', '==', user.uid));
          const holidaysSnap = await getDocs(holidaysQuery);
          holidaysSnap.docs.forEach(doc => {
            const h = doc.data();
            if (h.startDate && h.endDate) {
              // Range holiday: add all dates in range
              const start = moment(h.startDate).startOf('day');
              const end = moment(h.endDate).startOf('day');
              let cursor = start.clone();
              while (cursor.isSameOrBefore(end, 'day')) {
                holidayDates.add(cursor.format('YYYY-MM-DD'));
                cursor.add(1, 'day');
              }
            } else if (h.date) {
              holidayDates.add(moment(h.date).format('YYYY-MM-DD'));
            }
          });
        } catch (err) {
          console.warn('Could not fetch Firestore holidays for JournalReminder:', err);
        }

        // Also add static national holidays
        indonesianHolidays.forEach(h => holidayDates.add(h.date));

        // 1. Get Teaching Schedule (Routine)
        const scheduleQuery = query(
          collection(db, 'teachingSchedules'),
          where('userId', '==', user.uid),
          where('templateId', '==', activeTemplateId)
        );
        const scheduleSnap = await getDocs(scheduleQuery);
        const schedules = scheduleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ScheduleDoc));

        if (schedules.length === 0) {
          setMissingJournals([]);
          if (onUpdateMissingCount) onUpdateMissingCount(0);
          setIsLoading(false);
          return;
        }

        // 2. Get Journals from last 7 days from DB to compare
        const today = moment().endOf('day');
        const sevenDaysAgo = moment().subtract(6, 'days').startOf('day');
        const sevenDaysAgoDate = sevenDaysAgo.format('YYYY-MM-DD');

        const journalsQuery = query(
          collection(db, 'teachingJournals'),
          where('userId', '==', user.uid),
          where('date', '>=', sevenDaysAgoDate),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );

        const journalsSnap = await getDocs(journalsQuery);
        const journalKeys = new Set(journalsSnap.docs.map(doc => {
          const data = doc.data();
          const date = data.date || '';
          const className = (data.className || data.class || data.rombel || '').toString().trim().toLowerCase();
          const subjectName = (data.subjectName || data.subject || '').toString().trim().toLowerCase();
          return `${date}_${className}_${subjectName}`;
        }));

        const missing: MissingJournal[] = [];

        // 3. Iterate 7 days back
        for (let i = 0; i < 7; i++) {
          const checkDate = moment().subtract(i, 'days');

          // Skip future dates
          if (checkDate.isAfter(today)) continue;

          // Skip holidays - no journal required on holidays
          const checkDateStr = checkDate.format('YYYY-MM-DD');
          if (holidayDates.has(checkDateStr)) continue;

          const dayNameIndex = checkDate.day(); // 0-6
          const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const dayNameIndo = dayNames[dayNameIndex];

          // Filter schedules for this day name
          // RELAXED: If type is missing, we assume it's "teaching" for backward compatibility
          const daySchedules = schedules.filter(s => s.day === dayNameIndo && (s.type === 'teaching' || !s.type));

          for (const sched of daySchedules) {
            const classObj = typeof sched.class === 'object' && sched.class ? (sched.class as Record<string, string>).rombel : undefined;
            const originalClassName: string = classObj ?? (sched.className ?? sched.class ?? '') as string;
            const originalSubject: string = (sched.subjectName ?? sched.subject ?? '') as string;

            const normClassName = originalClassName.toString().trim().toLowerCase();
            const normSubject = originalSubject.toString().trim().toLowerCase();
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
  }, [user, activeSemester, academicYear, activeTemplateId, onUpdateMissingCount]);

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

            <div className="space-y-3">
              {missingJournals.slice(0, 3).map((item, idx) => (
                <Link
                  key={idx}
                  to={`/jurnal?date=${item.date}&classId=${item.className}&subjectId=${item.subject}`}
                  className="flex items-center justify-between group/item bg-white/50 dark:bg-black/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 transition-all duration-300 shadow-sm md:hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber-200/50 dark:bg-amber-800/30 rounded-lg text-amber-700 dark:text-amber-300">
                      <BookX size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-100">{item.formattedDate}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md font-black uppercase tracking-wider">{item.className}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{item.subject}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-amber-400 group-hover/item:text-amber-600 group-hover/item:translate-x-1 transition-all" />
                </Link>
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
          to={missingJournals.length > 0 ? `/jurnal?date=${missingJournals[0].date}&classId=${missingJournals[0].className}&subjectId=${missingJournals[0].subject}` : '/jurnal'}
          className="hidden sm:flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-800 hover:underline mt-1"
        >
          Lengkapi Sekarang <ChevronRight size={16} />
        </Link>
      </div>
      <Link
        to={missingJournals.length > 0 ? `/jurnal?date=${missingJournals[0].date}&classId=${missingJournals[0].className}&subjectId=${missingJournals[0].subject}` : '/jurnal'}
        className="sm:hidden flex w-full justify-center items-center gap-2 mt-4 bg-amber-500 text-white py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform"
      >
        Lengkapi Jurnal <ChevronRight size={16} />
      </Link>
    </div>
  );
};

export default JournalReminder;

