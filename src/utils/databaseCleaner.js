import { db } from '../firebase';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch
} from 'firebase/firestore';

/**
 * Database Cleaner Utility
 * Membersihkan data orphan dan tidak terpakai dari Firestore
 */

// 1. Identifikasi dan hapus dokumen dengan userId yang tidak valid
export const cleanOrphanedDocuments = async (userId) => {
    const collections = [
        'lessonPlans',
        'teachingPrograms',
        'assessments',
        'handouts',
        'quizzes',
        'schedules',
        'classes',
        'subjects',
        'students',
        'holidays'
    ];

    const results = {
        total: 0,
        deleted: 0,
        errors: [],
        details: {}
    };

    for (const collectionName of collections) {
        try {
            const q = query(collection(db, collectionName), where('userId', '==', userId));
            const snapshot = await getDocs(q);

            results.details[collectionName] = {
                total: snapshot.size,
                deleted: 0
            };
            results.total += snapshot.size;

            console.log(`[${collectionName}] Found ${snapshot.size} documents`);
        } catch (error) {
            results.errors.push({
                collection: collectionName,
                error: error.message
            });
            console.error(`Error in ${collectionName}:`, error);
        }
    }

    return results;
};

// 2. Hapus dokumen duplikat berdasarkan criteria
export const removeDuplicates = async (userId, collectionName, matchFields) => {
    try {
        const q = query(collection(db, collectionName), where('userId', '==', userId));
        const snapshot = await getDocs(q);

        const seen = new Map();
        const duplicates = [];

        snapshot.forEach((document) => {
            const data = document.data();
            const key = matchFields.map(field => data[field]).join('|');

            if (seen.has(key)) {
                // Ini duplikat, bandingkan timestamp
                const existing = seen.get(key);
                const existingTime = existing.data.createdAt?.seconds || 0;
                const currentTime = data.createdAt?.seconds || 0;

                // Simpan yang lebih baru, hapus yang lebih lama
                if (currentTime > existingTime) {
                    duplicates.push(existing.id);
                    seen.set(key, { id: document.id, data });
                } else {
                    duplicates.push(document.id);
                }
            } else {
                seen.set(key, { id: document.id, data });
            }
        });

        return {
            total: snapshot.size,
            duplicates: duplicates.length,
            duplicateIds: duplicates
        };
    } catch (error) {
        console.error('Error finding duplicates:', error);
        throw error;
    }
};

// 3. Hapus data lama berdasarkan umur
export const cleanOldData = async (userId, collectionName, daysOld = 365) => {
    try {
        const q = query(collection(db, collectionName), where('userId', '==', userId));
        const snapshot = await getDocs(q);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffSeconds = Math.floor(cutoffDate.getTime() / 1000);

        const oldDocs = [];

        snapshot.forEach((document) => {
            const data = document.data();
            const docTime = data.createdAt?.seconds || data.timestamp?.seconds || 0;

            if (docTime < cutoffSeconds) {
                oldDocs.push({
                    id: document.id,
                    date: new Date(docTime * 1000).toLocaleDateString('id-ID'),
                    ...data
                });
            }
        });

        return {
            total: snapshot.size,
            old: oldDocs.length,
            oldDocs
        };
    } catch (error) {
        console.error('Error finding old data:', error);
        throw error;
    }
};

// 4. Hapus batch documents
export const deleteBatch = async (collectionName, docIds) => {
    const batch = writeBatch(db);
    let deleted = 0;

    try {
        docIds.forEach((docId) => {
            const docRef = doc(db, collectionName, docId);
            batch.delete(docRef);
            deleted++;
        });

        await batch.commit();
        return { success: true, deleted };
    } catch (error) {
        console.error('Batch delete error:', error);
        throw error;
    }
};

// 5. Identifikasi referensi yang rusak
export const findBrokenReferences = async (userId) => {
    const results = {
        brokenClasses: [],
        brokenSubjects: [],
        brokenSchedules: []
    };

    try {
        // Ambil semua classes dan subjects yang valid
        const classesSnap = await getDocs(query(collection(db, 'classes'), where('userId', '==', userId)));
        const subjectsSnap = await getDocs(query(collection(db, 'subjects'), where('userId', '==', userId)));

        const validClassIds = new Set(classesSnap.docs.map(d => d.id));
        const validSubjectIds = new Set(subjectsSnap.docs.map(d => d.id));

        // Cek schedules untuk referensi yang rusak
        const schedulesSnap = await getDocs(query(collection(db, 'schedules'), where('userId', '==', userId)));

        schedulesSnap.forEach((document) => {
            const data = document.data();

            if (data.classId && !validClassIds.has(data.classId)) {
                results.brokenClasses.push({
                    id: document.id,
                    classId: data.classId,
                    className: data.class
                });
            }

            if (data.subjectId && !validSubjectIds.has(data.subjectId)) {
                results.brokenSubjects.push({
                    id: document.id,
                    subjectId: data.subjectId,
                    subjectName: data.subject
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Error finding broken references:', error);
        throw error;
    }
};

// 6. Generate laporan lengkap
export const generateCleanupReport = async (userId) => {
    const report = {
        timestamp: new Date().toISOString(),
        userId,
        collections: {},
        duplicates: {},
        oldData: {},
        brokenReferences: null,
        totalDocuments: 0,
        recommendations: []
    };

    try {
        // Scan semua collections
        const documentCounts = await cleanOrphanedDocuments(userId);
        report.collections = documentCounts.details;
        report.totalDocuments = documentCounts.total;

        // Cek duplikat untuk collections penting
        const duplicateChecks = [
            { collection: 'classes', fields: ['rombel', 'level'] },
            { collection: 'subjects', fields: ['name'] },
            { collection: 'students', fields: ['nisn'] }
        ];

        for (const check of duplicateChecks) {
            try {
                const dupes = await removeDuplicates(userId, check.collection, check.fields);
                if (dupes.duplicates > 0) {
                    report.duplicates[check.collection] = dupes;
                    report.recommendations.push(
                        `Ditemukan ${dupes.duplicates} duplikat di ${check.collection}`
                    );
                }
            } catch (error) {
                console.error(`Error checking duplicates in ${check.collection}:`, error);
            }
        }

        // Cek data lama (lebih dari 2 tahun)
        const oldDataChecks = ['lessonPlans', 'assessments', 'handouts'];
        for (const collectionName of oldDataChecks) {
            try {
                const old = await cleanOldData(userId, collectionName, 730); // 2 tahun
                if (old.old > 0) {
                    report.oldData[collectionName] = old;
                    report.recommendations.push(
                        `Ditemukan ${old.old} dokumen lama (>2 tahun) di ${collectionName}`
                    );
                }
            } catch (error) {
                console.error(`Error checking old data in ${collectionName}:`, error);
            }
        }

        // Cek referensi yang rusak
        try {
            const broken = await findBrokenReferences(userId);
            report.brokenReferences = broken;

            if (broken.brokenClasses.length > 0) {
                report.recommendations.push(
                    `Ditemukan ${broken.brokenClasses.length} jadwal dengan referensi kelas yang tidak valid`
                );
            }
            if (broken.brokenSubjects.length > 0) {
                report.recommendations.push(
                    `Ditemukan ${broken.brokenSubjects.length} jadwal dengan referensi mapel yang tidak valid`
                );
            }
        } catch (error) {
            console.error('Error checking broken references:', error);
        }

        // Summary
        if (report.recommendations.length === 0) {
            report.recommendations.push('✅ Database Anda dalam kondisi baik!');
        }

        return report;
    } catch (error) {
        console.error('Error generating cleanup report:', error);
        throw error;
    }
};

// 7. Eksekusi pembersihan otomatis (dengan konfirmasi)
export const executeAutoCleanup = async (userId, options = {}) => {
    const {
        removeDuplicates: shouldRemoveDuplicates = true,
        removeOldData = false, // Default false untuk keamanan
        fixBrokenReferences = true,
        daysOld = 730 // 2 tahun
    } = options;

    const results = {
        duplicatesRemoved: 0,
        oldDataRemoved: 0,
        brokenReferencesFixed: 0,
        errors: []
    };

    try {
        // 1. Hapus duplikat
        if (shouldRemoveDuplicates) {
            const duplicateChecks = [
                { collection: 'classes', fields: ['rombel', 'level'] },
                { collection: 'subjects', fields: ['name'] },
                { collection: 'students', fields: ['nisn'] }
            ];

            for (const check of duplicateChecks) {
                try {
                    const dupes = await removeDuplicates(userId, check.collection, check.fields);
                    if (dupes.duplicates > 0) {
                        await deleteBatch(check.collection, dupes.duplicateIds);
                        results.duplicatesRemoved += dupes.duplicates;
                    }
                } catch (error) {
                    results.errors.push({
                        action: 'removeDuplicates',
                        collection: check.collection,
                        error: error.message
                    });
                }
            }
        }

        // 2. Hapus data lama (hanya jika diizinkan)
        if (removeOldData) {
            const oldDataCollections = ['lessonPlans', 'assessments', 'handouts'];

            for (const collectionName of oldDataCollections) {
                try {
                    const old = await cleanOldData(userId, collectionName, daysOld);
                    if (old.old > 0) {
                        const idsToDelete = old.oldDocs.map(d => d.id);
                        await deleteBatch(collectionName, idsToDelete);
                        results.oldDataRemoved += old.old;
                    }
                } catch (error) {
                    results.errors.push({
                        action: 'removeOldData',
                        collection: collectionName,
                        error: error.message
                    });
                }
            }
        }

        // 3. Perbaiki referensi rusak
        if (fixBrokenReferences) {
            try {
                const broken = await findBrokenReferences(userId);
                const schedulesToDelete = [
                    ...broken.brokenClasses.map(s => s.id),
                    ...broken.brokenSubjects.map(s => s.id)
                ];

                if (schedulesToDelete.length > 0) {
                    await deleteBatch('schedules', [...new Set(schedulesToDelete)]);
                    results.brokenReferencesFixed = schedulesToDelete.length;
                }
            } catch (error) {
                results.errors.push({
                    action: 'fixBrokenReferences',
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Auto cleanup error:', error);
        throw error;
    }
};

export default {
    cleanOrphanedDocuments,
    removeDuplicates,
    cleanOldData,
    deleteBatch,
    findBrokenReferences,
    generateCleanupReport,
    executeAutoCleanup
};
