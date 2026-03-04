import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        activeSemester: 'Ganjil',
        academicYear: '',
        geminiModel: 'gemini-3-flash-preview',
        academicWeight: 50,
        attitudeWeight: 50,
        scheduleNotificationsEnabled: true,
        schoolDays: 6, // 5 or 6 school days per week
        activeTemplateId: null,
        activeTemplateName: 'Jadwal Normal',
        userProfile: null,
        loadingSettings: true
    });

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);

                // Clear previous snapshot if it exists (shouldn't happen with auth change but good practice)
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }

                // Use onSnapshot for real-time updates when user changes settings in Profile
                unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    const data = docSnap.exists() ? docSnap.data() : {};

                    // Sync with localStorage for non-React utilities (gemini.js)
                    if (data.geminiModel) {
                        localStorage.setItem('GEMINI_MODEL', data.geminiModel);
                    }
                    if (data.activeTemplateId) {
                        localStorage.setItem('ACTIVE_TEMPLATE_ID', data.activeTemplateId);
                    }

                    setSettings(prev => ({
                        ...prev,
                        activeSemester: data.activeSemester || prev.activeSemester,
                        academicYear: data.academicYear || prev.academicYear,
                        geminiModel: data.geminiModel || prev.geminiModel,
                        activeTemplateId: data.activeTemplateId || null,
                        activeTemplateName: data.activeTemplateName || 'Jadwal Normal',
                        academicWeight: data.academicWeight !== undefined ? data.academicWeight : prev.academicWeight,
                        attitudeWeight: data.attitudeWeight !== undefined ? data.attitudeWeight : prev.attitudeWeight,
                        scheduleNotificationsEnabled: data.scheduleNotificationsEnabled !== undefined ? data.scheduleNotificationsEnabled : prev.scheduleNotificationsEnabled,
                        schoolDays: data.schoolDays !== undefined ? data.schoolDays : prev.schoolDays,
                        userProfile: docSnap.exists() ? data : prev.userProfile,
                        loadingSettings: false
                    }));
                }, (error) => {
                    console.error("Settings snapshot error:", error);
                    setSettings(prev => ({ ...prev, loadingSettings: false }));
                });
            } else {
                // IMPORTANT: Unsubscribe when user logs out
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                setSettings(prev => ({ ...prev, userProfile: null, loadingSettings: false }));
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const value = React.useMemo(() => ({
        ...settings,
        // userProfile construction remains compatible with previous spread
        userProfile: settings.userProfile ? {
            activeSemester: settings.activeSemester,
            academicYear: settings.academicYear,
            geminiModel: settings.geminiModel,
            academicWeight: settings.academicWeight,
            attitudeWeight: settings.attitudeWeight,
            schoolDays: settings.schoolDays,
            scheduleNotificationsEnabled: settings.scheduleNotificationsEnabled,
            ...settings.userProfile
        } : null
    }), [settings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
