import React from 'react';
import { ShieldAlert } from 'lucide-react';
import moment from 'moment';
import { Infraction } from '../types/studentTypes';

interface StudentInfractionDetailProps {
    infractions: Infraction[];
}

const StudentInfractionDetail: React.FC<StudentInfractionDetailProps> = ({ infractions }) => {
    return (
        <div className="card-glass p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                    <ShieldAlert size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Rekam Pelanggaran</h2>
            </div>

            <div className="flex-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-3">
                    {infractions.length > 0 ? infractions.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl border border-red-50 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/10">
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">{item.infractionType || item.type || 'Pelanggaran'}</p>
                                <p className="text-[11px] sm:text-[10px] text-gray-400 font-medium italic mt-0.5">{item.note || 'Tidak ada catatan'}</p>
                            </div>
                            <div className="text-right ml-4">
                                <span className="text-xs sm:text-sm font-black text-red-600 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-lg">-{item.points}</span>
                                <p className="text-[10px] sm:text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">{moment(item.date).format('DD/MM/YY')}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-10 text-center text-gray-400 italic text-sm">Tidak ada catatan pelanggaran</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentInfractionDetail;

