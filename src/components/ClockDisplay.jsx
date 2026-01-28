import React, { useState, useEffect } from 'react';
import moment from 'moment';

const ClockDisplay = () => {
  const [currentTime, setCurrentTime] = useState(moment());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center relative">
      <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-gray-400 dark:text-gray-600 opacity-30"
            style={{ fontFamily: 'DSEG7Classic, monospace' }}>
        88:88:88
      </span>
      <p className="relative z-10 text-4xl font-bold transition-opacity duration-500 ease-in-out"
         style={{ fontFamily: 'DSEG7Classic, monospace', color: '#111111' }}>
        {currentTime.format('HH:mm:ss')}
      </p>
    </div>
  );
};

export default ClockDisplay;