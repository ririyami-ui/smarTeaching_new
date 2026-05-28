import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import toast from 'react-hot-toast';

export type TaskStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AITask {
    status: TaskStatus;
    progress: string;
    result: string | Record<string, unknown>;
    params: Record<string, unknown> | null;
    error?: string | null;
}

export interface AITasksState {
    lessonPlan: AITask;
    lkpd: AITask;
    handout: AITask;
    quiz: AITask;
    [key: string]: AITask;
}

export interface AIContextType {
    tasks: AITasksState;
    startGeneration: (type: string, generateFn: (params: Record<string, unknown> & { onProgress: (msg: string) => void }) => Promise<unknown>, params: Record<string, unknown>) => Promise<unknown>;
    clearTask: (type: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = (): AIContextType => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error("useAI must be used within an AIProvider");
    }
    return context;
};

export interface AIProviderProps {
    children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
    const [tasks, setTasks] = useState<AITasksState>({
        lessonPlan: { status: 'idle', progress: '', result: '', params: null },
        lkpd: { status: 'idle', progress: '', result: '', params: null },
        handout: { status: 'idle', progress: '', result: '', params: null },
        quiz: { status: 'idle', progress: '', result: '', params: null },
    });

    const updateTask = useCallback((type: string, data: Partial<AITask>) => {
        setTasks(prev => ({
            ...prev,
            [type]: { ...prev[type], ...data }
        }));
    }, []);

    const startGeneration = useCallback(async (type: string, generateFn: (params: Record<string, unknown> & { onProgress: (msg: string) => void }) => Promise<unknown>, params: Record<string, unknown>) => {
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
                onProgress: (msg: string) => {
                    updateTask(type, { progress: msg });
                }
            });

            const cleanResult = typeof result === 'string' ? result.replace(/\|\|/g, '') : result as string | Record<string, unknown>;

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
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`AI Generation Error (${type}):`, err);
            updateTask(type, {
                status: 'error',
                error: err.message,
                progress: 'Terjadi kesalahan'
            });
            toast.error(`Gagal: ${err.message}`);
            throw err;
        }
    }, [tasks, updateTask]);

    const clearTask = useCallback((type: string) => {
        updateTask(type, { status: 'idle', result: '', progress: '', params: null, error: null });
    }, [updateTask]);

    return (
        <AIContext.Provider value={{ tasks, startGeneration, clearTask }}>
            {children}
        </AIContext.Provider>
    );
};
