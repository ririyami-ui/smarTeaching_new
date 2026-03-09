import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

const AIContext = createContext();

export const useAI = () => useContext(AIContext);

export const AIProvider = ({ children }) => {
    const [tasks, setTasks] = useState({
        lessonPlan: { status: 'idle', progress: '', result: '', params: null },
        lkpd: { status: 'idle', progress: '', result: '', params: null },
        handout: { status: 'idle', progress: '', result: '', params: null },
        quiz: { status: 'idle', progress: '', result: '', params: null },
    });

    const updateTask = useCallback((type, data) => {
        setTasks(prev => ({
            ...prev,
            [type]: { ...prev[type], ...data }
        }));
    }, []);

    const startGeneration = useCallback(async (type, generateFn, params) => {
        // Prevent starting if already generating
        if (tasks[type]?.status === 'loading') {
            toast.error("Generasi bagian ini sedang berjalan...");
            return;
        }

        updateTask(type, {
            status: 'loading',
            progress: 'Memulai generasi AI...',
            result: '',
            params,
            error: null
        });

        try {
            const result = await generateFn({
                ...params,
                onProgress: (msg) => {
                    updateTask(type, { progress: msg });
                }
            });

            const cleanResult = typeof result === 'string' ? result.replace(/\|\|/g, '') : result;

            updateTask(type, {
                status: 'success',
                result: cleanResult,
                progress: 'Selesai!'
            });

            toast.success(`Generasi ${type === 'lessonPlan' ? 'RPP' : type.toUpperCase()} selesai!`, {
                duration: 5000,
                position: 'bottom-right'
            });

            return result;
        } catch (error) {
            console.error(`AI Generation Error (${type}):`, error);
            updateTask(type, {
                status: 'error',
                error: error.message,
                progress: 'Terjadi kesalahan'
            });
            toast.error(`Gagal: ${error.message}`);
            throw error;
        }
    }, [tasks, updateTask]);

    const clearTask = useCallback((type) => {
        updateTask(type, { status: 'idle', result: '', progress: '', params: null, error: null });
    }, [updateTask]);

    return (
        <AIContext.Provider value={{ tasks, startGeneration, clearTask }}>
            {children}
        </AIContext.Provider>
    );
};
