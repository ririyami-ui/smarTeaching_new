import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [activeSemester, setActiveSemester] = useState('Ganjil');
    const [academicYear, setAcademicYear] = useState('');
    const [geminiModel, setGeminiModel] = useState('gemini-3-flash-preview'); // Default fallback
    const [userProfile, setUserProfile] = useState(null); // Full user profile
    const [academicWeight, setAcademicWeight] = useState(50);
    const [attitudeWeight, setAttitudeWeight] = useState(50);
    const [loadingSettings, setLoadingSettings] = useState(true);

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
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.activeSemester) setActiveSemester(data.activeSemester);
                        if (data.academicYear) setAcademicYear(data.academicYear);
                        if (data.geminiModel) setGeminiModel(data.geminiModel);
                        if (data.academicWeight !== undefined) setAcademicWeight(data.academicWeight);
                        if (data.attitudeWeight !== undefined) setAttitudeWeight(data.attitudeWeight);
                        setUserProfile(data); // Store full profile
                    }
                    setLoadingSettings(false);
                }, (error) => {
                    console.error("Settings snapshot error:", error);
                    setLoadingSettings(false);
                });
            } else {
                // IMPORTANT: Unsubscribe when user logs out to prevent permission-denied errors
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                setLoadingSettings(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const value = {
        activeSemester,
        academicYear,
        geminiModel,
        academicWeight,
        attitudeWeight,
        userProfile: { activeSemester, academicYear, geminiModel, academicWeight, attitudeWeight, ...userProfile }, // Expose full profile
        loadingSettings
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
