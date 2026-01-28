import React from 'react';
import { Sparkles } from 'lucide-react';

const WelcomeScreen = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-950 overflow-hidden">
            {/* Abstract Background Shapes */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/50 dark:bg-purple-900/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/50 dark:bg-blue-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative flex flex-col items-center">
                {/* Logo Container */}
                <div className="relative mb-8 animate-welcome-zoom-in">
                    <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                    <div className="relative p-8 bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-white/50 dark:border-purple-500/20 animate-welcome-float">
                        <img
                            src="/Logo Smart Teaching Baru_.png"
                            alt="Smart Teaching Logo"
                            className="w-24 h-24 object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/logo.png"; // Fallback to logo.png
                            }}
                        />
                        <div className="absolute -top-2 -right-2 p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg border border-white/20">
                            <Sparkles size={20} className="text-white animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2 animate-welcome-zoom-in" style={{ animationDelay: '0.2s' }}>
                    <h1 className="text-4xl font-black tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                            Smart Teaching
                        </span>
                    </h1>
                    <p className="text-purple-600/60 dark:text-purple-400/60 font-medium tracking-widest uppercase text-xs">
                        Professional Teaching Assistant
                    </p>
                </div>

                {/* Loading Indicator */}
                <div className="mt-12 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-dots-blink"></div>
                    <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-dots-blink" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-dots-blink" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-10 text-center animate-fade-in-up" style={{ animationDelay: '1s' }}>
                <p className="text-purple-900/40 dark:text-purple-100/30 text-[10px] font-bold uppercase tracking-widest">
                    Build 2.0.1 • Deepmind AI Powered
                </p>
            </div>
        </div>
    );
};

export default WelcomeScreen;
