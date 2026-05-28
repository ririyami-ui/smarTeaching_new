import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDoc,
    doc,
    deleteDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

/**
 * Custom hook to manage history, classes, and user profile for AI generators.
 * @param {string} historyCollection - Collection name for history (e.g., 'lkpd_history', 'quizzes')
 * @param {Object} options - Additional options
 */
export const useGeneratorHistory = (historyCollection, _options = {}) => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [classes, setClasses] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // const { } = options;

    // Load User Profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user) return;
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                }
            } catch (e) {
                console.error('Error fetching user profile:', e);
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchUserProfile();
    }, [user]);

    // Load History & Classes
    useEffect(() => {
        if (!user) return;

        // Fetch History
        const historyQuery = query(
            collection(db, historyCollection),
            where('userId', '==', user.uid)
        );

        const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Manual sorting with safety check for malformed timestamps
            const sorted = data.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return bTime - aTime;
            });
            setHistory(sorted);
            setLoadingHistory(false);
        }, (error) => {
            console.error(`${historyCollection} snapshot error:`, error);
            setLoadingHistory(false);
        });

        // Fetch Classes
        const classesQuery = query(
            collection(db, 'classes'),
            where('userId', '==', user.uid),
            orderBy('rombel')
        );

        const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
            setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Classes snapshot error:", error);
        });

        return () => {
            unsubHistory();
            unsubClasses();
        };
    }, [historyCollection, user]);

    const deleteHistoryItem = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, historyCollection, id));
            toast.success("Catatan riwayat berhasil dihapus");
            return true;
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Gagal menghapus riwayat");
            return false;
        }
    }, [historyCollection]);

    return {
        history,
        loadingHistory,
        classes,
        userProfile,
        loadingProfile,
        deleteHistoryItem
    };
};

/**
 * Helper to simulate progression for AI tasks
 */
export const useProgressSimulation = (isGenerating) => {
    const [progress, setProgress] = useState({ stage: '', message: '', percentage: 0 });

    useEffect(() => {
        let interval;
        if (isGenerating) {
            let current = 5;
            setProgress({ stage: 'starting', message: 'Memulai proses...', percentage: 5 });

            interval = setInterval(() => {
                current += Math.floor(Math.random() * 8) + 2;
                if (current > 95) current = 95;

                let stage = 'preparing';
                let message = 'Menyiapkan data pemrosesan...';

                if (current > 30 && current <= 70) {
                    stage = 'generating';
                    message = 'AI sedang meracik konten...';
                } else if (current > 70) {
                    stage = 'parsing';
                    message = 'Menyusun format dokumen...';
                }

                setProgress({ stage, message, percentage: current });
            }, 800);
        } else {
            setProgress({ stage: '', message: '', percentage: 0 });
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isGenerating]);

    return { progress, setProgress };
};
