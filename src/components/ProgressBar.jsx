import React from 'react';
import { Sparkles } from 'lucide-react';

const ProgressBar = ({
    isGenerating,
    stage = 'starting',
    message = 'Memulai proses...',
    percentage = 0
}) => {
    if (!isGenerating) return null;

    return (
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl animate-fade-in w-full max-w-full overflow-hidden">
            <div className="flex flex-row items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-blue-500 text-white rounded-lg shadow-sm flex-shrink-0">
                        <Sparkles className="animate-pulse w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide sm:tracking-wider truncate">
                            {stage === 'preparing' && 'Tahap 1: Persiapan'}
                            {stage === 'generating' && 'Tahap 2: AI Berpikir'}
                            {stage === 'parsing' && 'Tahap 3: Finalisasi'}
                            {stage === 'complete' && 'Tahap 4: Selesai'}
                            {stage === 'starting' && 'Memulai...'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 truncate">
                            {message}
                        </p>
                    </div>
                </div>
                <span className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 flex-shrink-0">
                    {percentage}%
                </span>
            </div>

            <div className="w-full h-2 sm:h-3 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden shadow-inner">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out relative"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                </div>
            </div>

            <div className="flex justify-between mt-2 sm:mt-3 text-[8px] sm:text-[10px] font-medium text-blue-500 dark:text-blue-400 uppercase tracking-widest sm:tracking-widest">
                <span className={percentage >= 10 ? 'opacity-100' : 'opacity-30'}>Persiapan</span>
                <span className={percentage >= 50 ? 'opacity-100' : 'opacity-30'}>Generasi</span>
                <span className={percentage >= 85 ? 'opacity-100' : 'opacity-30'}>Validasi</span>
                <span className={percentage >= 100 ? 'opacity-100' : 'opacity-30'}>Selesai</span>
            </div>
        </div>
    );
};

export default ProgressBar;
