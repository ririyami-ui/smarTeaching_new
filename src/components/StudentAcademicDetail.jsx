import React from 'react';
import { BookOpen } from 'lucide-react';
import moment from 'moment';

const StudentAcademicDetail = ({ filteredGrades }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                        <BookOpen size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Akademik</h2>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="pb-4">Tanggal</th>
                            <th className="pb-4">Materi / Subjek</th>
                            <th className="pb-4 text-right">Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y dark:divide-gray-700">
                        {filteredGrades.length > 0 ? filteredGrades.map((g, i) => (
                            <tr key={i} className="group">
                                <td className="py-3 text-gray-500">{moment(g.date).format('DD/MM/YYYY')}</td>
                                <td className="py-3">
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{g.material}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{g.subjectName} • {g.assessmentType}</p>
                                </td>
                                <td className="py-3 text-right">
                                    <span className={`px-2.5 py-1 rounded-lg font-bold ${parseFloat(g.score) >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                                        {g.score}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="3" className="py-10 text-center text-gray-400">Belum ada data nilai</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentAcademicDetail;
