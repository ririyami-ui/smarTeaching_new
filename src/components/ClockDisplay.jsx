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
    <div className="text-center">
      <p className="text-4xl font-bold text-primary-dark dark:text-primary-light transition-opacity duration-500 ease-in-out"
         style={{ fontFamily: 'DSEG7Classic, monospace' }}>
        {currentTime.format('HH:mm:ss')}
      </p>
    </div>
  );
};

export default ClockDisplay;