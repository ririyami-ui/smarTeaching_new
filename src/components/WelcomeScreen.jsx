import { Sparkles, Building2 } from 'lucide-react';
import logoMGMP from '../assets/lOGO mgmp informatika NEW.png';

const WelcomeScreen = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#f8f9ff] dark:bg-[#020617] overflow-hidden py-10 sm:py-14">
            {/* Premium Aurora Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-purple-500/20 dark:bg-purple-600/10 rounded-full blur-[120px] animate-aurora"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-500/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-aurora" style={{ animationDelay: '-5s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[100px] animate-aurora" style={{ animationDelay: '-10s' }}></div>
            </div>

            <div /> {/* Top Spacer for effective centering */}

            <div className="relative flex flex-col items-center">
                {/* 3D Glass Logo Container - Refined for Elegance */}
                <div className="relative mb-8 sm:mb-10 animate-welcome-zoom-in">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full scale-125 animate-pulse"></div>
                    <div className="relative glass-icon-container glass-glow-indigo !rounded-[4rem] backdrop-blur-[40px] shadow-[0_32px_64px_-16px_rgba(31,38,135,0.2)] p-10 sm:p-12 welcome-glass animate-welcome-float border border-white/40">
                        <div className="relative z-10">
                            <img
                                src="/Logo Smart Teaching 3D.png"
                                alt="Smart Teaching logo"
                                className="w-28 h-28 sm:w-32 sm:h-32 object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-transform duration-700 hover:scale-110"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/logo.png";
                                }}
                            />
                            {/* Decorative Premium Sparkle */}
                            <div className="absolute -top-6 -right-6 p-2.5 bg-gradient-to-br from-indigo-400 via-purple-500 to-blue-600 rounded-2xl shadow-2xl border border-white/50 rotate-12 scale-110">
                                <Sparkles size={22} className="text-white animate-pulse" />
                            </div>
                        </div>

                        {/* Internal Multi-Layered Glows */}
                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-indigo-400/30 to-transparent blur-2xl rounded-full"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-gradient-to-tl from-purple-400/20 to-transparent blur-xl rounded-full"></div>
                    </div>
                </div>

                {/* Text Content with Sophisticated Typography */}
                <div className="text-center space-y-4 animate-welcome-zoom-in" style={{ animationDelay: '0.2s' }}>
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-indigo-900 to-gray-900 dark:from-white dark:via-indigo-100 dark:to-gray-300">
                                Smart Teaching
                            </span>
                        </h1>
                        <span className="text-[10px] font-black text-indigo-500/50 dark:text-indigo-400/40 tracking-[0.5em] uppercase">Enterprise Edition</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-gray-500/80 dark:text-gray-400/70 font-bold tracking-[0.25em] uppercase text-[10px] sm:text-[11px] max-w-[280px] leading-relaxed">
                            AI-Powered Professional Assistant
                        </p>

                        {/* High-End Progress Section */}
                        <div className="mt-8 flex flex-col items-center gap-4">
                            <div className="w-40 sm:w-56 h-[1.5px] bg-gray-200/50 dark:bg-gray-800/50 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full h-full animate-progress-line"></div>
                            </div>
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 tracking-widest uppercase">Version 2.0.3</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Partnership & Info Section */}
            <div className="relative w-full px-6 flex flex-col items-center gap-6 sm:gap-10 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
                <div className="flex items-center gap-5 sm:gap-6 px-6 py-4 sm:px-8 sm:py-4 rounded-[2rem] sm:rounded-[2.5rem] bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl relative group overflow-hidden">
                    {/* Animated Glow Background for Partnership */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="relative z-10 flex items-center gap-4 sm:gap-5">
                        <div className="p-2 sm:p-2.5 bg-white dark:bg-gray-900/50 rounded-2xl shadow-inner border border-blue-50 dark:border-blue-900/20">
                            <img
                                src={logoMGMP}
                                alt="MGMP Logo"
                                className="w-10 h-10 sm:w-16 sm:h-16 object-contain transition-transform duration-500 group-hover:scale-110"
                            />
                        </div>
                        <div className="h-8 sm:h-10 w-[1px] bg-black/10 dark:bg-white/10"></div>
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                                <Building2 size={10} className="text-blue-500" />
                                <p className="text-[8px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Official Partnership</p>
                            </div>
                            <h2 className="text-sm sm:text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter leading-none">
                                MGMP Informatika <br />
                                <span className="text-blue-600 dark:text-blue-400 opacity-80">Kabupaten Bondowoso</span>
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-2 rounded-full bg-white/20 dark:bg-black/10 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center gap-3">
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                        Ready for Education Transformation v2.0.3
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
