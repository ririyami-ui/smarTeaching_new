import React from 'react';
import { FileText, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

const StudentNarrativeSection = ({
    narrativeNote,
    setNarrativeNote,
    handleGenerateNarrative,
    isGenerating,
    handleSaveNarrative,
    isSaving
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                        <FileText size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catatan Guru Mapel</h2>
                </div>
                <button
                    onClick={() => handleGenerateNarrative()}
                    disabled={isGenerating}
                    className="group relative flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-xl text-[10px] font-black hover:bg-purple-200 transition-all disabled:opacity-50"
                >
                    <Zap size={12} fill="currentColor" />
                    {isGenerating ? 'AI Menganalisis...' : 'SMARTY AI'}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Menggunakan Quota AI
                    </span>
                </button>
            </div>

            <textarea
                value={narrativeNote}
                onChange={(e) => setNarrativeNote(e.target.value)}
                placeholder="Tuliskan catatan kemajuan belajar, saran, dan motivasi untuk siswa..."
                className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-700 dark:text-gray-300 custom-scrollbar resize-none mb-4"
            />

            {/* Narrative Preview Area */}
            {narrativeNote && (
                <div className="mb-6 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <Zap size={10} className="text-purple-500" />
                        Pratinjau Tampilan (Rendered)
                    </div>
                    <div id="narrative-preview-content" className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 prose dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                        >
                            {narrativeNote}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSaveNarrative}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                >
                    {isSaving ? 'Menyimpan...' : 'Simpan Note'}
                </button>
            </div>
        </div>
    );
};

export default StudentNarrativeSection;
