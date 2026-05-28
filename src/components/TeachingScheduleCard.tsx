import React from 'react';
import moment from 'moment';
import 'moment/locale/id'; // Import Indonesian locale
import { Clock, CheckCircle, PlayCircle, Bell, CalendarOff, Calendar, Sparkles, FileText, Book, Zap, RefreshCw, Camera } from 'lucide-react';
import Countdown from './Countdown'; // Import Countdown component
import { getTopicForSchedule } from '../utils/topicUtils';
import { getHolidayGreeting } from '../utils/greetingUtils';

moment.updateLocale('id', {
  relativeTime: {
    future: "dalam %s",
    past: "%s yang lalu",
    s: 'beberapa detik',
    ss: 'beberapa detik',
    m: "semenit",
    mm: "%d menit",
    h: "sejam",
    hh: "%d jam",
    d: "sehari",
    dd: "%d hari",
    M: "sebulan",
    MM: "%d bulan",
    y: "setahun",
    yy: "%d tahun"
  }
});

interface ScheduleData {
  id: string;
  type?: string;
  subject?: string;
  class?: string | { rombel: string };
  startTime: string;
  endTime: string;
  startPeriod?: string;
  endPeriod?: string;
  activityName?: string;
  subjectId?: string;
  [key: string]: unknown;
}

interface HolidayData {
  name?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  [key: string]: unknown;
}

interface CarryOverData {
  material: string;
  [key: string]: unknown;
}

interface VariantStyle {
  bg: string;
  border: string;
  accent: string;
  text: string;
  badge: string;
}

interface TeachingScheduleCardProps {
  schedules: ScheduleData[];
  currentTime: moment.Moment;
  holiday: HolidayData | null;
  programs: Record<string, unknown>[];
  classes: { id: string; rombel: string; [key: string]: unknown }[];
  carryOverMap: Record<string, CarryOverData>;
  activeSemester: string;
  academicYear: string;
  userProfile: { name?: string; school?: string; [key: string]: unknown };
}

const TeachingScheduleCard = ({ schedules, currentTime, holiday, programs, classes, carryOverMap, activeSemester, academicYear, userProfile }: TeachingScheduleCardProps) => {

  const getClosingGreeting = () => {
    const greetings = [
      {
        message: "Alhamdulillah, tugas mulia hari ini telah tuntas. Selamat beristirahat, Bapak/Ibu Guru!",
        sub: "Dedikasi Anda hari ini luar biasa"
      },
      {
        message: "Pembelajaran hari ini telah berakhir. Terima kasih atas inspirasi yang Anda bagikan hari ini!",
        sub: "Siswa beruntung memiliki Anda"
      },
      {
        message: "Waktunya melepas lelah. Sampai jumpa di hari esok dengan semangat baru!",
        sub: "Recharge energi untuk esok hari"
      },
      {
        message: "Hari yang penuh makna telah usai. Istirahatlah yang cukup untuk mengawali esok yang lebih cerah.",
        sub: "Malam ini milik Anda"
      },
      {
        message: "Tugas mengajar selesai. Selamat menikmati waktu berkualitas bersama keluarga!",
        sub: "Kebahagiaan dimulai dari rumah"
      }
    ];
    // Use day of the year + day of week as seed to keep it consistent throughout the day but varying by day
    const seed = moment().dayOfYear() + moment().day();
    return greetings[seed % greetings.length];
  };

  const isBreakActiveLogic = (startStr: string, endStr: string) => {
    const now = currentTime;
    const todayStr = now.format('YYYY-MM-DD');
    const start = moment(`${todayStr} ${startStr} `, 'YYYY-MM-DD HH:mm');
    const end = moment(`${todayStr} ${endStr} `, 'YYYY-MM-DD HH:mm');

    if (end.isBefore(start)) end.add(1, 'day');
    return now.isBetween(start, end, null, '[]');
  };

  const isAnyBreakHappening = () => {
    return schedules.some(s => {
      if (s.type !== 'non-teaching') return false;
      return isBreakActiveLogic(s.startTime, s.endTime);
    });
  };

  const isBreakActiveItem = (schedule: ScheduleData) => {
    if (schedule.type !== 'non-teaching') return false;
    const now = currentTime;
    const todayStr = now.format('YYYY-MM-DD');
    const start = moment(`${todayStr} ${schedule.startTime} `, 'YYYY-MM-DD HH:mm');
    const fiveMinutesBefore = moment(start).subtract(5, 'minutes');
    const end = moment(`${todayStr} ${schedule.endTime} `, 'YYYY-MM-DD HH:mm');

    if (end.isBefore(start)) end.add(1, 'day');
    return now.isBetween(fiveMinutesBefore, end, null, '[]');
  };

  const getScheduleStatus = (schedule: ScheduleData) => {
    const now = currentTime;
    const todayStr = now.format('YYYY-MM-DD');
    const startTime = moment(`${todayStr} ${schedule.startTime} `, 'YYYY-MM-DD HH:mm');
    const endTime = moment(`${todayStr} ${schedule.endTime} `, 'YYYY-MM-DD HH:mm');
    const fiveMinutesBefore = moment(startTime).subtract(5, 'minutes');

    if (endTime.isBefore(startTime)) {
      endTime.add(1, 'day');
    }

    if (schedule.type === 'teaching' && isAnyBreakHappening() && now.isBetween(startTime, endTime, null, '[]')) {
      return {
        status: 'paused',
        message: 'Sedang Istirahat',
        icon: <Clock className="mr-2" />,
        estimation: null,
      };
    }

    if (now.isBetween(startTime, endTime, null, '[]')) {
      return {
        status: 'ongoing',
        message: 'Sedang Berlangsung',
        icon: <PlayCircle className="mr-2" />,
        estimation: <Countdown endTime={schedule.endTime} prefix="" />,
      };
    }

    if (now.isAfter(endTime)) {
      return {
        status: 'finished',
        message: 'Selesai',
        icon: <CheckCircle className="mr-2" />,
        estimation: null,
      };
    }

    if (now.isBetween(fiveMinutesBefore, startTime, null, '[]')) {
      return {
        status: 'upcoming-soon',
        message: 'Segera',
        icon: <Bell className="mr-2 animate-pulse" />,
        estimation: <Countdown endTime={schedule.startTime} prefix="Dimulai dalam" />,
      };
    }

    return {
      status: 'upcoming',
      message: null,
      icon: null,
      estimation: `Dimulai ${startTime.from(now)} `,
    };
  };

  // Helper to determine if holiday blocks routine schedule
  const isBlockingHoliday = (h: HolidayData) => {
    if (!h) return false;
    const name = (h.name || '').toLowerCase();

    // Upacara and Senam are usually morning activities, so regular schedule might continue
    if (name.includes('upacara') || name.includes('senam')) return false;

    // All other holidays/agendas (Rapat, Workshop, Libur, etc.) are considered blocking
    return true;
  };

  const shouldHideSchedules = holiday && isBlockingHoliday(holiday);

  // Filter: Show Teaching or Active Non-Teaching
  const visibleSchedules = shouldHideSchedules ? [] : schedules.filter(s => {
    // 1. Get current status
    const { status } = getScheduleStatus(s);

    // 2. Hide finished items (to let next agenda move up)
    if (status === 'finished') return false;

    // 3. For non-teaching, keep existing active logic
    if (s.type === 'non-teaching') return isBreakActiveItem(s);

    return true;
  }).sort((a, b) => {
    // Priority: Non-Teaching first if active
    const isNonTeachingA = a.type === 'non-teaching';
    const isNonTeachingB = b.type === 'non-teaching';
    if (isNonTeachingA && !isNonTeachingB) return -1;
    if (!isNonTeachingA && isNonTeachingB) return 1;
    return moment(a.startTime, 'HH:mm').diff(moment(b.startTime, 'HH:mm'));
  });

  return (
    <div className="w-full p-4 sm:p-5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden relative">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-gray-800 dark:text-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="glass-icon-container glass-glow-blue w-10 h-10 group-hover:scale-110 transition-all duration-500">
              <Calendar size={18} className="opacity-80 text-gray-800 dark:text-white" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
            </div>
            <span>Jadwal Hari Ini</span>
          </div>
        </h2>

        {visibleSchedules.length === 0 && !holiday ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-10 space-y-4">
            {schedules.length > 0 && schedules.every(s => getScheduleStatus(s).status === 'finished') ? (
              (() => {
                const closing = getClosingGreeting();
                return (
                  <div className="w-full p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 rounded-2xl shadow-xl border border-white/30 text-white animate-fade-in-up relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>

                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-lg border border-white/20">
                            <CheckCircle size={28} className="text-white" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-extrabold tracking-tight leading-tight">Tugas Tuntas!</h3>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">Semua Pembelajaran Selesai</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 mt-1">
                        <p className="text-sm font-medium italic opacity-95 leading-relaxed text-left">
                          &quot;{closing.message}&quot;
                        </p>
                        <div className="flex items-center gap-1.5 mt-3 opacity-90">
                          <Sparkles size={12} className="text-amber-200" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{closing.sub}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                  <CalendarOff size={32} />
                </div>
                <p className="font-medium">Tidak ada jadwal untuk hari ini</p>
              </>
            )}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Holiday Agenda at Top */}
            {holiday && (() => {
              const card = getHolidayGreeting(holiday);
              const teacherName = userProfile?.name || 'Bapak/Ibu Guru';
              const schoolName = userProfile?.school || 'Sekolah';

              return (
                <div className={`w-full p-6 bg-gradient-to-br ${card.gradient} rounded-3xl shadow-xl text-white animate-fade-in-up relative overflow-hidden group border-2 border-white/20`}>
                  {/* Decorative Elements for Screenshot */}
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform rotate-12 scale-150">
                    {card.icon}
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col items-center text-center gap-3 sm:gap-4 py-1 sm:py-2">
                    {/* Header Info */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-80 mb-0.5">Agenda Hari Ini</span>
                      <h3 className="text-lg md:text-2xl font-black tracking-tight leading-tight drop-shadow-md uppercase italic">
                        {holiday.name}
                      </h3>
                    </div>

                    {/* Main Icon */}
                    <div className="bg-white/20 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-xl border border-white/30 transform group-hover:scale-105 transition-transform duration-500">
                      {React.cloneElement(card.icon, { size: 32, className: 'sm:w-10 sm:h-10' })}
                    </div>

                    {/* Message Box */}
                    <div className="max-w-md">
                      <p className="text-sm sm:text-lg font-bold italic opacity-100 leading-snug mb-2 sm:mb-3 drop-shadow-sm">
                        &quot;{card.message}&quot;
                      </p>

                      {/* Divider */}
                      <div className="w-10 h-0.5 bg-white/30 mx-auto rounded-full mb-2 sm:mb-3"></div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/80">{card.sub}</span>
                      </div>
                    </div>

                    {/* Footer / Signature for Status */}
                    <div className="w-full mt-1 pt-3 border-t border-white/20 flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <div className="h-px w-6 bg-white/30"></div>
                        <p className="text-[10px] font-bold tracking-wider">{teacherName}</p>
                        <div className="h-px w-6 bg-white/30"></div>
                      </div>
                      <p className="text-[8px] font-black uppercase opacity-60 tracking-tighter">{schoolName}</p>
                    </div>

                    {/* Instructions hint - hidden on desktop hover maybe? */}
                    <div className="absolute top-4 right-4 opacity-40">
                      <Camera size={16} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {visibleSchedules.map((schedule) => {
              const isNonTeaching = schedule.type === 'non-teaching';
              const { status, message, icon, estimation } = getScheduleStatus(schedule);

              const variants: Record<string, VariantStyle> = {
                ongoing: {
                  bg: isNonTeaching ? "bg-pink-500/10" : "bg-emerald-500/10",
                  border: isNonTeaching ? "border-pink-500/30" : "border-emerald-500/30",
                  accent: isNonTeaching ? "bg-pink-500" : "bg-emerald-500",
                  text: isNonTeaching ? "text-pink-700 dark:text-pink-400" : "text-emerald-700 dark:text-emerald-400",
                  badge: isNonTeaching ? "bg-pink-500 text-white" : "bg-emerald-500 text-white"
                },
                'upcoming-soon': {
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/30",
                  accent: "bg-amber-500",
                  text: "text-amber-700 dark:text-amber-400",
                  badge: "bg-amber-500 text-white"
                },
                finished: {
                  bg: "bg-slate-100 dark:bg-slate-800/50",
                  border: "border-slate-200 dark:border-slate-700",
                  accent: "bg-slate-400",
                  text: "text-slate-500 dark:text-slate-400",
                  badge: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                },
                upcoming: {
                  bg: "bg-white/50 dark:bg-gray-800/40",
                  border: "border-gray-100 dark:border-gray-700/50",
                  accent: "bg-gray-300 dark:bg-gray-600",
                  text: "text-gray-600 dark:text-gray-400",
                  badge: "bg-gray-100 dark:bg-gray-700 text-gray-500"
                },
                paused: {
                  bg: "bg-gray-50/80 dark:bg-gray-800/60",
                  border: "border-gray-200/50 dark:border-gray-700/50",
                  accent: "bg-gray-400",
                  text: "text-gray-500 dark:text-gray-400",
                  badge: "bg-gray-100 dark:bg-gray-700 text-gray-500"
                }
              };

              const currentVariant = variants[status];
              const cardTitle = isNonTeaching ? (schedule.activityName || 'Kegiatan') : schedule.subject;
              const cardSubtitle = isNonTeaching
                ? (schedule.class && schedule.class !== 'Umum' && schedule.class !== 'Semua Kelas' ? `Kelas ${schedule.class}` : 'Umum')
                : `Kelas ${schedule.class}`;

              return (
                <div
                  key={schedule.id}
                  className={`relative overflow-hidden ${isNonTeaching ? 'p-2.5 px-3.5 sm:p-3 sm:px-4' : 'p-3.5 sm:p-4'} rounded-xl border transition-all duration-300 group ${currentVariant.bg} ${currentVariant.border} ${status === 'ongoing' ? 'shadow-lg ring-1 ring-inset ring-black/5 md:scale-[1.005]' : 'hover:bg-opacity-80'} hover:z-10 ${status === 'upcoming-soon' ? 'animate-pulse-subtle' : ''}`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${currentVariant.accent}`}></div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`${isNonTeaching ? 'text-sm font-bold' : 'text-base sm:text-lg font-bold'} truncate ${currentVariant.text}`}>
                            {cardTitle}
                          </h3>
                          {status === 'ongoing' && (
                            <span className={`flex h-1.5 w-1.5 rounded-full ${isNonTeaching ? 'bg-pink-500' : 'bg-emerald-500'} animate-ping`}></span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          <span className={`${isNonTeaching ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'bg-gray-200/50 dark:bg-gray-700/50'} px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider`}>{cardSubtitle}</span>
                          <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                          <span className="font-mono bg-white/30 dark:bg-black/20 px-1.5 py-0.5 rounded italic sm:not-italic">{schedule.startTime} - {schedule.endTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0 border-black/5 dark:border-white/5">
                      {(status === 'ongoing' || status === 'upcoming-soon') && estimation && (
                        <div className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-1 sm:py-0.5 rounded-md shadow-inner bg-black/5 dark:bg-white/5 ${currentVariant.text}`}>
                          {estimation}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {status === 'upcoming' || status === 'upcoming-soon' ? (
                          <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${currentVariant.badge}`}>
                            {status === 'upcoming-soon' ? 'Segera' : 'Nanti'}
                          </div>
                        ) : status === 'finished' ? (
                          <CheckCircle size={16} className="text-slate-400" />
                        ) : (
                          <div className={`p-1.5 rounded-lg ${currentVariant.badge} bg-opacity-20`}>
                            {status === 'paused' ? <Clock size={14} /> : icon || <Zap size={14} />}
                          </div>
                        )}

                        {/* Compact specific label for mobile status */}
                        {status === 'paused' && (
                          <span className="text-[10px] font-bold sm:hidden text-gray-400 uppercase tracking-tighter">Istirahat</span>
                        )}
                      </div>
                    </div>
                  </div>


                  {!isNonTeaching && (status === 'ongoing' || status === 'upcoming-soon' || status === 'paused') && (
                    <div className={`mt-3 pt-3 border-t ${currentVariant.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-lg ${currentVariant.badge} bg-opacity-20`}>
                          {status === 'paused' ? <Clock size={12} /> : icon || <Zap size={12} />}
                        </div>
                        <span className={`text-[11px] font-bold ${currentVariant.text}`}>
                          {status === 'paused' ? 'Sedang Istirahat' : message}
                        </span>
                      </div>
                      {(() => {
                        const carryOver = carryOverMap && carryOverMap[`${schedule.class}-${schedule.subject}`];
                        const topic = getTopicForSchedule(schedule, currentTime, programs || [], classes || [], activeSemester, academicYear);

                        return (
                          <div className="flex flex-col gap-2 w-full">
                            {carryOver && (
                              <div className="flex items-start gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/40 rounded-xl border border-red-200 dark:border-red-800 shadow-sm animate-bounce-short">
                                <RefreshCw size={12} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider leading-none mb-1">Materi Tertunda:</p>
                                  <p className="text-[11px] font-bold text-red-700 dark:text-red-300 italic leading-snug break-words line-clamp-2">
                                    {carryOver.material}
                                  </p>
                                </div>
                              </div>
                            )}
                            {topic && (
                              <div className="flex items-start gap-2 px-3 py-2 bg-white/50 dark:bg-black/20 rounded-xl border border-white/30 dark:border-white/5 shadow-inner animate-in slide-in-from-right-2 duration-500">
                                <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none mb-1">Topik:</p>
                                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 italic leading-snug break-words line-clamp-2">
                                    {topic}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {!isNonTeaching && schedule.startPeriod && (
                    <div className="absolute top-1 right-2 opacity-20 pointer-events-none hidden sm:block">
                      <span className="text-[10px] font-bold italic tracking-tighter uppercase">JP {schedule.startPeriod}-{schedule.endPeriod}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachingScheduleCard;
