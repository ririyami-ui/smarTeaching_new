import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';

interface CountdownProps {
  endTime: string;
  prefix?: string;
}

const Countdown: React.FC<CountdownProps> = ({ endTime, prefix }) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(() => {
    const end = moment(endTime, 'HH:mm');
    // If end time is in the past, add a day (for overnight schedules)
    if (end.isBefore(moment())) {
      end.add(1, 'day');
    }
    return end.diff(moment(), 'seconds');
  });

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const end = moment(endTime, 'HH:mm');
      if (end.isBefore(moment())) {
        end.add(1, 'day');
      }
      const remaining = end.diff(moment(), 'seconds');

      if (remaining > 0) {
        setRemainingTime(remaining);
      } else {
        setRemainingTime(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endTime]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}j ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  return (
    <span>
      {remainingTime > 0 ? `${prefix || 'Berakhir dalam'} ${formatTime(remainingTime)}` : 'Telah berakhir'}
    </span>
  );
};

export default Countdown;

