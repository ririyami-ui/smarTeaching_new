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
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);

                // Use onSnapshot for real-time updates when user changes settings in Profile
                const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
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
                });

                return () => unsubscribeSnapshot();
            } else {
                setLoadingSettings(false);
            }
        });

        return () => unsubscribeAuth();
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
