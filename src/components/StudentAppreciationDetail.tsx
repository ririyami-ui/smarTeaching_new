import React from 'react';
import { Trophy } from 'lucide-react';
import moment from 'moment';
import { Appreciation } from '../types/studentTypes';

interface StudentAppreciationDetailProps {
    appreciations: Appreciation[];
}

const StudentAppreciationDetail: React.FC<StudentAppreciationDetailProps> = ({ appreciations }) => {
    return (
        <div className="card-glass p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
                    <Trophy size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Rekam Prestasi</h2>
            </div>

            <div className="flex-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-3">
                    {appreciations.length > 0 ? appreciations.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl border border-emerald-50 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/10">
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">{item.type}</p>
                                <p className="text-[11px] sm:text-[10px] text-gray-400 font-medium italic mt-0.5">{item.note || 'Tidak ada catatan'}</p>
                            </div>
                            <div className="text-right ml-4">
                                <span className="text-xs sm:text-sm font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-lg">+{item.points}★</span>
                                <p className="text-[10px] sm:text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">{moment(item.date).format('DD/MM/YY')}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-10 text-center text-gray-400 italic text-sm">Belum ada rekam prestasi</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAppreciationDetail;

