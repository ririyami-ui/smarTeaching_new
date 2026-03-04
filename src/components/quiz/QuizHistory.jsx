import React from 'react';
import { History, Trash2, Loader2 } from 'lucide-react';

const QuizHistory = ({
    savedQuizzes,
    loadingHistory,
    onSelectQuiz,
    onDeleteQuiz,
    activeSemester
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <History size={18} className="text-purple-500" />
                Riwayat Kuis
            </h3>

            <div className="flex-grow overflow-y-auto space-y-2 pr-1 max-h-[300px] lg:max-h-[600px]">
                {loadingHistory ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-gray-400" />
                    </div>
                ) : savedQuizzes.length > 0 ? (
                    savedQuizzes.map((q) => (
                        <div
                            key={q.id}
                            onClick={() => {
                                onSelectQuiz({
                                    ...q.quiz,
                                    context_semester: q.context_semester || activeSemester
                                }, {
                                    subject: q.subject || '',
                                    gradeLevel: q.gradeLevel || '',
                                    topic: q.topic || ''
                                });
                            }}
                            className="group p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer relative"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                                        {q.subject} - {q.gradeLevel}
                                    </p>
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                                        {q.topic}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {q.createdAt?.toDate
                                            ? new Date(q.createdAt.toDate()).toLocaleDateString('id-ID')
                                            : 'Baru saja'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteQuiz(e, q.id);
                                    }}
                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <p className="text-xs text-gray-400">Belum ada riwayat kuis.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizHistory;
