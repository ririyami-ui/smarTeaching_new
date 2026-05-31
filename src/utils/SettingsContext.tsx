import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface SettingsState {
  activeSemester: string;
  academicYear: string;
  geminiModel: string;
  academicWeight: number;
  attitudeWeight: number;
  scheduleNotificationsEnabled: boolean;
  schoolDays: number;
  activeTemplateId: string | null;
  activeTemplateName: string;
  userProfile: Record<string, unknown> | null;
  loadingSettings: boolean;
}

const defaultSettings: SettingsState = {
  activeSemester: 'Ganjil',
  academicYear: '',
  geminiModel: 'gemini-3.1-flash-lite',
  academicWeight: 50,
  attitudeWeight: 50,
  scheduleNotificationsEnabled: true,
  schoolDays: 6,
  activeTemplateId: null,
  activeTemplateName: 'Jadwal Normal',
  userProfile: null,
  loadingSettings: true,
};

const SettingsContext = createContext<SettingsState>(defaultSettings);

const getCurrentSemester = (): string => {
  const month = new Date().getMonth() + 1;
  return month >= 7 ? 'Ganjil' : 'Genap';
};

export const useSettings = (): SettingsState => {
  return useContext(SettingsContext);
};

export const SettingsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>({
    activeSemester: getCurrentSemester(),
    academicYear: '',
    geminiModel: 'gemini-3.1-flash-lite',
    academicWeight: 50,
    attitudeWeight: 50,
    scheduleNotificationsEnabled: true,
    schoolDays: 6,
    activeTemplateId: null,
    activeTemplateName: 'Jadwal Normal',
    userProfile: null,
    loadingSettings: true
  });

  useEffect(() => {
    let unsubscribeSnapshot: import('firebase/firestore').Unsubscribe | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          const data = docSnap.exists() ? docSnap.data() : {};

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
        }, (error: unknown) => {
          console.error("Settings snapshot error:", error);
          setSettings(prev => ({ ...prev, loadingSettings: false }));
        });
      } else {
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

  const value = useMemo(() => ({
    ...settings,
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

