import React from 'react';
import moment from 'moment';
import 'moment/locale/id'; // Import Indonesian locale
import { Clock, CheckCircle, PlayCircle } from 'lucide-react';

moment.locale('id'); // Set locale to Indonesian

const TeachingScheduleCard = ({ schedules, currentTime }) => {
  const getScheduleStatus = (schedule) => {
    const now = currentTime;
    let startTime = moment(schedule.startTime, 'HH:mm');
    let endTime = moment(schedule.endTime, 'HH:mm');

    // If end time is earlier than start time, it means it crosses midnight
    if (endTime.isBefore(startTime)) {
      endTime.add(1, 'day');
    }

    if (now.isBetween(startTime, endTime, null, '[]')) {
      return {
        status: 'ongoing',
        message: 'Pembelajaran berlangsung',
        color: 'bg-green-500 text-white',
        icon: <PlayCircle className="mr-2" />,
        estimation: `Berakhir ${endTime.from(now)}`,
      };
    }

    if (now.isAfter(endTime)) {
      return {
        status: 'finished',
        message: 'Jam Pelajaran selesai',
        color: 'bg-gray-400 text-gray-800',
        icon: <CheckCircle className="mr-2" />,
        estimation: null,
      };
    }

    return {
      status: 'upcoming',
      message: null,
      color: 'bg-surface-light dark:bg-surface-dark',
      icon: null,
      estimation: `Dimulai ${startTime.from(now)}`,
    };
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-2xl flex flex-col justify-center items-center text-center">
      <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Jadwal Mengajar</h2>
      
      {schedules.length === 0 ? (
        <div className="text-center text-text-muted-light dark:text-text-muted-dark py-4">
          <p>Tidak ada jadwal mengajar hari ini.</p>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {schedules.map((schedule) => {
            const { status, message, color, icon, estimation } = getScheduleStatus(schedule);

            return (
              <div key={schedule.id} className={`p-4 rounded-lg shadow-md transition-colors duration-500 ${color}`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-lg font-bold">{schedule.subject}</p>
                  <p className="text-sm font-semibold">Kelas: {schedule.class}</p>
                </div>
                <p className="text-sm font-medium mb-3">{schedule.startTime} - {schedule.endTime} (Jam ke-{schedule.startPeriod}-{schedule.endPeriod})</p>
                
                {status === 'ongoing' && (
                  <div className="flex items-center justify-center font-semibold text-sm mb-2 text-white bg-green-600 rounded-full px-3 py-1 wavy-border-animation">
                    {icon}
                    <p>{message}</p>
                  </div>
                )}
                {(status === 'finished' || status === 'upcoming') && (
                  <div className="flex items-center justify-center font-semibold text-sm mb-2">
                    {icon}
                    <p>{message}</p>
                  </div>
                )}

                {estimation && (
                  <div className="flex items-center justify-center text-xs font-medium">
                    <Clock size={14} className="mr-1.5" />
                    <p>{estimation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeachingScheduleCard;