import React from 'react';
import {
    Save, Loader2, FileText, Download, Image as ImageIcon, Grid,
    BrainCircuit, Hash, ChevronUp, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { formatAnswer } from '../../utils/quizExportUtils';
import VisualizationRenderer from './VisualizationRenderer';

interface QuizQuestion {
  type: string;
  question: string;
  stimulus?: string;
  image_hint?: string;
  indicator?: string;
  cognitive_level?: string;
  options?: string[];
  left_side?: string[];
  right_side?: string[];
  rows?: string[];
  columns?: string[];
  statements?: { text: string }[];
  items?: string[];
  explanation?: string;
  competency?: string;
  visualization?: {
    type: 'chart' | 'function' | 'diagram' | 'image' | 'scratch' | 'logic' | 'chemistry' | 'music';
    config: Record<string, unknown>;
  };
}

interface QuizResultType {
  questions: QuizQuestion[];
}

interface QuizResultsProps {
  quizResult: QuizResultType | null;
  isSaving: boolean;
  onSave: () => void;
  onExportWord: () => void;
  onExportPDF: () => void;
  onExportKartuSoalWord: () => void;
  onExportKartuSoalPDF: () => void;
  onExportKisiKisiWord: () => void;
  onExportKisiKisiPDF: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({
    quizResult,
    isSaving,
    onSave,
    onExportWord,
    onExportPDF,
    onExportKartuSoalWord,
    onExportKartuSoalPDF,
    onExportKisiKisiWord,
    onExportKisiKisiPDF
}) => {
    if (!quizResult) return null;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold dark:text-white shrink-0">Preview Hasil</h2>
                <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold disabled:opacity-50 text-sm flex-1 md:flex-none min-w-[140px]"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Simpan Kuis
                    </button>
                    <button onClick={onExportWord} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm flex-1 md:flex-none min-w-[120px]">
                        <FileText size={18} /> Word
                    </button>
                    <button onClick={onExportPDF} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold transition-colors text-sm flex-1 md:flex-none min-w-[120px]">
                        <Download size={18} /> PDF
                    </button>

                    <button onClick={onExportKartuSoalWord} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-semibold transition-colors text-sm flex-1 md:flex-none min-w-[150px]">
                        <FileText size={18} /> Kartu Soal (Word)
                    </button>
                    <button onClick={onExportKartuSoalPDF} className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-semibold transition-colors text-sm flex-1 md:flex-none min-w-[150px]">
                        <ImageIcon size={18} /> Kartu Soal (PDF)
                    </button>

                    <button onClick={onExportKisiKisiWord} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-semibold transition-colors text-sm flex-1 md:flex-none min-w-[150px]">
                        <FileText size={18} /> Kisi-kisi (Word)
                    </button>
                    <button onClick={onExportKisiKisiPDF} className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 font-semibold transition-colors text-sm flex-1 md:flex-none min-w-[150px]">
                        <Grid size={18} /> Kisi-kisi (PDF)
                    </button>
                </div>
            </div>

            {/* TIP: Pedagogy Context */}
            {quizResult.questions && quizResult.questions.length > 0 && !quizResult.questions[0].competency && (
                <div className="mt-2 text-xs bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100 flex items-start gap-2 italic">
                    <BrainCircuit size={14} className="mt-0.5 shrink-0" />
                    <span>Catatan: Kompetensi & Indikator otomatis hanya tersedia untuk kuis yang baru digenerate. Kuis lama mungkin menampilkan field ini sebagai kosong.</span>
                </div>
            )}

            {/* QUESTIONS GRID */}
            <div className="grid grid-cols-1 gap-6">
                {quizResult && Array.isArray(quizResult.questions) && quizResult.questions.length > 0 ? (
                    quizResult.questions.map((q, idx) => (
                        <div key={idx} id={`quiz-question-${idx}`} className="card-glass p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 relative">
                            <span className="absolute top-4 right-4 text-xs font-bold text-gray-400 uppercase border px-2 py-1 rounded">{(q.type || 'pg').replace('_', ' ')}</span>
                            <div className="flex gap-4 mb-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-grow">
                                    <div className="font-normal text-lg text-gray-800 dark:text-white prose dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {q.stimulus ? q.stimulus + '\n\n' : ''}
                                        </ReactMarkdown>

                                        {q.visualization && (
                                            <VisualizationRenderer visualization={q.visualization} />
                                        )}

                                        {q.image_hint && !q.visualization && (() => {
                                            const cleanText = q.image_hint.trim().replace(/^\[+/, '').replace(/\]+$/, '');
                                            return (
                                                <div className="my-2 text-sm text-gray-500 italic">
                                                    [{cleanText}]
                                                </div>
                                            );
                                        })()}

                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {q.question || 'Petunjuk: Klik "Generate" untuk membuat soal.'}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            <div className="ml-0 md:ml-14 space-y-4">
                                {/* PEDAGOGICAL METADATA */}
                                {(q.indicator || q.cognitive_level) && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {q.cognitive_level && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase border border-purple-200">
                                                Level: {q.cognitive_level}
                                            </span>
                                        )}
                                        {q.indicator && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 italic">
                                                Indikator: {q.indicator}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* OPTION RENDERER */}
                                {(q.type === 'pg' || q.type === 'pg_complex') && Array.isArray(q.options) && (
                                    <div className="space-y-2 ml-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${q.type === 'pg_complex' ? 'rounded-md' : 'rounded-full'} border-gray-400`}></div>
                                                <span className="text-gray-600 dark:text-gray-300">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {opt}
                                                    </ReactMarkdown>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'matching' && Array.isArray(q.left_side) && Array.isArray(q.right_side) && (
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                        <div className="space-y-2">
                                            {q.left_side.map((l, i) => (
                                                <div key={i} className="p-2 border bg-white dark:bg-gray-800 rounded text-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {l}
                                                    </ReactMarkdown>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {q.right_side.map((r, i) => (
                                                <div key={i} className="p-2 border bg-white dark:bg-gray-800 rounded text-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {r}
                                                    </ReactMarkdown>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {q.type === 'pg_matrix' && Array.isArray(q.rows) && Array.isArray(q.columns) && (
                                    <div className="overflow-x-auto mt-2 border rounded-lg dark:border-gray-700">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                <tr>
                                                    <th className="p-2 border dark:border-gray-600 font-bold">Pernyataan</th>
                                                    {q.columns.map((col, cIdx) => (
                                                        <th key={cIdx} className="p-2 border dark:border-gray-600 text-center font-bold">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                {col}
                                                            </ReactMarkdown>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {q.rows.map((row, rIdx) => (
                                                    <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="p-2 border dark:border-gray-600">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                {row}
                                                            </ReactMarkdown>
                                                        </td>
                                                        {q.columns?.map((col, cIdx) => (
                                                            <td key={cIdx} className="p-2 border dark:border-gray-600 text-center">
                                                                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-500 rounded mx-auto"></div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {q.type === 'true_false' && Array.isArray(q.statements) && (
                                    <div className="space-y-1">
                                        {q.statements.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 border-b last:border-0 border-dashed">
                                                <span className="text-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {s.text}
                                                    </ReactMarkdown>
                                                </span>
                                                <div className="flex gap-2 text-xs font-bold text-gray-400">
                                                    <span className="border px-2 py-1 rounded">B</span>
                                                    <span className="border px-2 py-1 rounded">S</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'short_answer' && (
                                    <div className="mt-2 p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                        <div className="flex items-center gap-2 text-gray-400 italic text-sm">
                                            <Hash size={14} /> Jawab: ................................................................................
                                        </div>
                                    </div>
                                )}

                                {q.type === 'sequencing' && Array.isArray(q.items) && (
                                    <div className="mt-2 space-y-2">
                                        {q.items.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm">
                                                <div className="flex flex-col gap-1">
                                                    <ChevronUp size={12} className="text-gray-400" />
                                                    <ChevronDown size={12} className="text-gray-400" />
                                                </div>
                                                <div className="flex-grow text-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {item}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-gray-400 italic">Petunjuk: Urutkan langkah-langkah di atas dengan benar.</p>
                                    </div>
                                )}

                                {/* ANSWER KEY REVEAL */}
                                <div className="mt-6 pt-4 border-t border-dashed dark:border-gray-700">
                                    <details className="group">
                                        <summary className="cursor-pointer text-sm font-semibold text-green-600 flex items-center gap-2 select-none">
                                            <span>Lihat Kunci & Pembahasan</span>
                                        </summary>
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/10 p-3 rounded">
                                            <div className="flex gap-1">
                                                <strong>Jawaban:</strong>
                                                <div className="prose-sm dark:prose-invert">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {formatAnswer(q)}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                            {q.explanation && (
                                                <div className="mt-2">
                                                    <strong>Pembahasan:</strong>
                                                    <div className="prose-sm dark:prose-invert">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                            {q.explanation}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 font-bold">Terjadi kesalahan teknis saat memproses soal.</p>
                        <p className="text-sm text-gray-400 mt-2 italic">Format data dari AI tidak terbaca dengan benar. Mohon klik tombol Generate ulang untuk mendapatkan hasil yang utuh.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizResults;

