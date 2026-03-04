import React from 'react';
import { ShieldAlert } from 'lucide-react';

const StudentInfractionDetail = ({ infractions }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                        <ShieldAlert size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catatan Kedisiplinan</h2>
                </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    {infractions.length > 0 ? infractions.map((inf, i) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                    {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(inf.date))}
                                </span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 text-[10px] font-black rounded-md">+{inf.points} POIN</span>
                            </div>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{inf.infractionType}</p>
                            {inf.description && <p className="text-xs text-gray-500 mt-1 italic">{inf.description}</p>}
                        </div>
                    )) : (
                        <div className="py-10 text-center text-gray-400">Tidak ada catatan pelanggaran</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentInfractionDetail;
