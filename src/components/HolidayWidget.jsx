import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

const HolidayWidget = () => {
    const [upcomingHolidays, setUpcomingHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nearestHoliday, setNearestHoliday] = useState(null);
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        const fetchHolidays = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'holidays'), where('userId', '==', auth.currentUser.uid));
                const snapshot = await getDocs(q);
                const holidays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const today = moment().startOf('day');
                const futureHolidays = holidays
                    .map(h => {
                        // Handle Ranges: uses startDate if available, else date
                        const date = h.startDate ? h.startDate : h.date;
                        // If it's a range, check if today is before the END of the range
                        const endDate = h.endDate ? moment(h.endDate) : moment(h.date);
                        return { ...h, sortDate: moment(date), endDate: endDate };
                    })
                    .filter(h => {
                        // Skip if the holiday is completely in the past OR is currently happening today
                        // (Because today's holiday is already shown in the main TeachingScheduleCard)
                        return h.endDate.isAfter(today, 'day');
                    })
                    .sort((a, b) => a.sortDate.diff(b.sortDate));

                setUpcomingHolidays(futureHolidays.slice(0, 5)); // Take top 5 (Responsive: 2 on mobile, 5 on desktop)

                if (futureHolidays.length > 0) {
                    setNearestHoliday(futureHolidays[0]);
                }
            } catch (error) {
                console.error("Error fetching holidays for widget:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHolidays();
    }, []);

    useEffect(() => {
        if (nearestHoliday) {
            const updateCountdown = () => {
                const now = moment();
                const holidayDate = nearestHoliday.sortDate.clone().startOf('day'); // Use the sorted date object we created
                const duration = moment.duration(holidayDate.diff(now));
                const days = Math.ceil(duration.asDays());

                if (days === 0) {
                    setCountdown('Hari Ini!');
                } else if (days === 1) {
                    setCountdown('Besok!');
                } else {
                    setCountdown(`${days} Hari Lagi`);
                }
            };

            updateCountdown();
            const timer = setInterval(updateCountdown, 60000); // Update every minute
            return () => clearInterval(timer);
        }
    }, [nearestHoliday]);

    if (loading) return <div className="animate-pulse h-48 bg-gray-200 rounded-2xl"></div>;

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg h-full flex flex-col relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Calendar size={120} />
            </div>

            <div className="flex items-center gap-2 mb-4 relative z-10">
                <Calendar size={24} className="text-white/90" />
                <h2 className="text-lg font-bold">Agenda Sekolah</h2>
            </div>

            {upcomingHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-white/80">
                    <p>Belum ada jadwal libur.</p>
                </div>
            ) : (
                <>
                    {/* Nearest Holiday Countdown */}
                    {nearestHoliday && (
                        <div className="mb-6 relative z-10">
                            <p className="text-sm text-indigo-100 mb-1">Libur Terdekat:</p>
                            <h3 className="text-2xl font-bold leading-tight">{nearestHoliday.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                                    {nearestHoliday.startDate && nearestHoliday.endDate
                                        ? `${moment(nearestHoliday.startDate).format('DD MMM')} - ${moment(nearestHoliday.endDate).format('DD MMM')}`
                                        : moment(nearestHoliday.date).format('dddd, DD MMMM')}
                                </span>
                                <span className="bg-yellow-400 text-indigo-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                    {countdown}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-3 relative z-10 pr-2 custom-scrollbar">
                        {upcomingHolidays.slice(1).map((h, index) => (
                            <div key={h.id} className={`flex items-center justify-between bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-colors ${index > 0 ? 'hidden md:flex' : 'flex'}`}>
                                <div>
                                    <p className="font-semibold text-sm truncate w-32 md:w-40">{h.name}</p>
                                    <p className="text-xs text-indigo-100">
                                        {h.startDate && h.endDate
                                            ? `${moment(h.startDate).format('DD MMM')} - ${moment(h.endDate).format('DD MMM')}`
                                            : moment(h.date).format('DD MMM YYYY')}
                                    </p>
                                </div>
                                {/* <ArrowRight size={14} className="text-white/50" /> */}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default HolidayWidget;
