import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
    generateCleanupReport,
    executeAutoCleanup,
    deleteBatch,
    removeDuplicates,
    cleanOldData
} from '../utils/databaseCleaner';
import {
    Database,
    Trash2,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Download,
    Play,
    FileText,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const DatabaseCleanupPage = () => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [cleaning, setCleaning] = useState(false);
    const [cleanupOptions, setCleanupOptions] = useState({
        removeDuplicates: true,
        removeOldData: false,
        fixBrokenReferences: true,
        daysOld: 730
    });

    const handleGenerateReport = async () => {
        if (!auth.currentUser) {
            toast.error('Anda harus login terlebih dahulu');
            return;
        }

        setLoading(true);
        try {
            const reportData = await generateCleanupReport(auth.currentUser.uid);
            setReport(reportData);
            toast.success('Laporan berhasil dibuat!');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Gagal membuat laporan: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (!auth.currentUser) {
            toast.error('Anda harus login terlebih dahulu');
            return;
        }

        if (!window.confirm('⚠️ PERINGATAN!\n\nProses pembersihan akan menghapus data secara permanen.\nPastikan Anda telah membaca laporan dan memahami konsekuensinya.\n\nLanjutkan?')) {
            return;
        }

        setCleaning(true);
        try {
            const results = await executeAutoCleanup(auth.currentUser.uid, cleanupOptions);

            toast.success(
                `Pembersihan selesai!\n` +
                `- Duplikat dihapus: ${results.duplicatesRemoved}\n` +
                `- Data lama dihapus: ${results.oldDataRemoved}\n` +
                `- Referensi diperbaiki: ${results.brokenReferencesFixed}`
            );

            // Refresh report
            await handleGenerateReport();
        } catch (error) {
            console.error('Error during cleanup:', error);
            toast.error('Gagal membersihkan database: ' + error.message);
        } finally {
            setCleaning(false);
        }
    };

    const downloadReport = () => {
        if (!report) return;

        const reportText = JSON.stringify(report, null, 2);
        const blob = new Blob([reportText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-cleanup-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Laporan berhasil diunduh');
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Database className="text-blue-600" size={32} />
                            Database Cleanup Manager
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Identifikasi dan bersihkan data yang tidak terpakai
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="animate-spin" size={18} />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Generate Report
                            </>
                        )}
                    </button>
                </div>

                {/* Warning Banner */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-lg mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">Peringatan Penting</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Proses pembersihan database bersifat <strong>permanen</strong> dan tidak dapat dibatalkan.
                                Pastikan Anda memahami laporan sebelum menjalankan pembersihan.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Report Section */}
                {report && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-5 rounded-xl border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Total Dokumen</h3>
                                    <Database className="text-blue-600" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{report.totalDocuments}</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-5 rounded-xl border border-amber-200 dark:border-amber-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Masalah Ditemukan</h3>
                                    <AlertTriangle className="text-amber-600" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                                    {report.recommendations.length - (report.recommendations[0]?.includes('✅') ? 1 : 0)}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-5 rounded-xl border border-green-200 dark:border-green-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Status</h3>
                                    <CheckCircle className="text-green-600" size={20} />
                                </div>
                                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                    {report.recommendations[0]?.includes('✅') ? 'Baik' : 'Perlu Pembersihan'}
                                </p>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" />
                                Rekomendasi
                            </h3>
                            <ul className="space-y-2">
                                {report.recommendations.map((rec, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                        {rec.includes('✅') ? (
                                            <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Collection Details */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Detail per Collection</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(report.collections).map(([name, data]) => (
                                    <div key={name} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{name}</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{data.total}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cleanup Options */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Play size={18} className="text-blue-600" />
                                Opsi Pembersihan
                            </h3>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cleanupOptions.removeDuplicates}
                                        onChange={(e) => setCleanupOptions({ ...cleanupOptions, removeDuplicates: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">Hapus Duplikat</p>
                                        <p className="text-xs text-gray-500">Menghapus data yang terduplikasi (kelas, mapel, siswa)</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cleanupOptions.removeOldData}
                                        onChange={(e) => setCleanupOptions({ ...cleanupOptions, removeOldData: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                            Hapus Data Lama
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Hati-hati!</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Menghapus dokumen lebih dari {cleanupOptions.daysOld} hari (RPP, Asesmen, Handout)
                                        </p>
                                        {cleanupOptions.removeOldData && (
                                            <div className="mt-2">
                                                <input
                                                    type="number"
                                                    value={cleanupOptions.daysOld}
                                                    onChange={(e) => setCleanupOptions({ ...cleanupOptions, daysOld: parseInt(e.target.value) })}
                                                    min="30"
                                                    max="3650"
                                                    className="w-32 px-3 py-1 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <span className="ml-2 text-xs text-gray-500">hari</span>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cleanupOptions.fixBrokenReferences}
                                        onChange={(e) => setCleanupOptions({ ...cleanupOptions, fixBrokenReferences: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">Perbaiki Referensi Rusak</p>
                                        <p className="text-xs text-gray-500">Menghapus jadwal dengan referensi kelas/mapel tidak valid</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={downloadReport}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                <Download size={18} />
                                Download Report
                            </button>
                            <button
                                onClick={handleCleanup}
                                disabled={cleaning}
                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-semibold"
                            >
                                {cleaning ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={18} />
                                        Cleaning...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Jalankan Pembersihan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!report && !loading && (
                    <div className="text-center py-16">
                        <Database size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            Belum Ada Laporan
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500 mb-6">
                            Klik tombol "Generate Report" untuk memulai analisis database
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseCleanupPage;
