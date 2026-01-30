import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import 'moment/locale/id';

// Force Indonesian locale globally for this component
moment.locale('id');

const ClockDisplay = ({ size = 'lg', variant = 'card' }) => {
  const [currentTime, setCurrentTime] = useState(moment());
  const [schoolName, setSchoolName] = useState('Smart Teaching Manager');

  useEffect(() => {
    const fetchSchoolName = async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists() && docSnap.data().school) {
            setSchoolName(docSnap.data().school);
          }
        } catch (error) {
          console.error("Error fetching school name:", error);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchSchoolName(user);
      }
    });

    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const timeStr = currentTime.format('HH:mm:ss');
  const [hours, minutes, seconds] = timeStr.split(':');

  // Manual Indonesian date formatter to ensure it works regardless of library locale issues
  const formatIndonesianDate = (m) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[m.day()];
    const dayDate = m.date();
    const monthName = months[m.month()];
    const year = m.year();
    return `${dayName}, ${dayDate} ${monthName} ${year}`;
  };

  const isSmall = size === 'sm';
  const isMinimal = variant === 'minimal';

  const segmentSize = isSmall ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl';
  const labelSize = isSmall ? 'text-[8px]' : 'text-[10px]';
  const dotSize = isSmall ? 'w-1 h-1' : 'w-1.5 h-1.5 sm:w-2 sm:h-2';
  const gapSize = isSmall ? 'gap-1' : 'gap-1.5 sm:gap-3';

  const SegmentDisplay = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Background Segments (Off state) */}
        <span className={`${segmentSize} font-bold text-gray-200 dark:text-gray-800 opacity-20`}
          style={{ fontFamily: 'DSEG7Classic, monospace' }}>
          88
        </span>
        {/* Active Segments (On state) */}
        <p className={`absolute inset-0 z-10 ${segmentSize} font-bold text-cyan-700 dark:text-cyan-500 drop-shadow-[0_0_8px_rgba(8,145,178,0.3)]`}
          style={{ fontFamily: 'DSEG7Classic, monospace' }}>
          {value}
        </p>
      </div>
      {!isSmall && (
        <span className={`${labelSize} font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest`}>
          {label}
        </span>
      )}
    </div>
  );

  const containerClasses = isMinimal
    ? "flex flex-col items-center"
    : "bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm mx-auto overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* School Name Header - Hidden in sm minimal */}
      {!isMinimal && (
        <div className="mb-4 text-center">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-tighter truncate px-2">
            {schoolName}
          </h3>
          <div className="h-0.5 w-12 bg-cyan-700 mx-auto mt-1 rounded-full opacity-50" />
        </div>
      )}

      {/* Main Clock Face */}
      <div className={`flex items-center justify-center ${gapSize} ${!isMinimal ? 'mb-4' : ''} select-none`}>
        <SegmentDisplay value={hours} label="Jam" />

        <div className={`flex flex-col ${isSmall ? 'gap-1.5' : 'gap-3'} py-2`}>
          <div className={`${dotSize} bg-cyan-700 dark:bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]`} />
          <div className={`${dotSize} bg-cyan-700 dark:bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]`} />
        </div>

        <SegmentDisplay value={minutes} label="Menit" />

        <div className={`flex flex-col ${isSmall ? 'gap-1.5' : 'gap-3'} py-2`}>
          <div className={`${dotSize} bg-cyan-700 dark:bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]`} />
          <div className={`${dotSize} bg-cyan-700 dark:bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]`} />
        </div>

        <SegmentDisplay value={seconds} label="Detik" />
      </div>

      {/* Elegant Date Footer */}
      {!isSmall && (
        <div className={`pt-4 ${!isMinimal ? 'border-t border-gray-100 dark:border-gray-800' : ''} text-center`}>
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.2em] uppercase italic">
            {formatIndonesianDate(currentTime)}
          </p>
        </div>
      )}

      {isSmall && isMinimal && (
        <p className="text-[10px] font-bold text-cyan-800 dark:text-cyan-200 mt-2 tracking-widest uppercase opacity-80">
          {formatIndonesianDate(currentTime)}
        </p>
      )}
    </div>
  );
};

export default ClockDisplay;