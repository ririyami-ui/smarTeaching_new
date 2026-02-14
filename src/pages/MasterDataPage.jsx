import React, { useState } from 'react';
import StudentMasterData from '../components/StudentMasterData';
import ClassMasterData from '../components/ClassMasterData';
import ScheduleInputMasterData from '../components/ScheduleInputMasterData';
import ProfileEditor from '../components/ProfileEditor';
import SubjectMasterData from '../components/SubjectMasterData';
import DatabaseManager from '../components/DatabaseManager';
import {
  User,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Database,
  Sparkles
} from 'lucide-react';

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'classes', label: 'Kelas', icon: Users },
    { id: 'students', label: 'Siswa', icon: GraduationCap },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'scheduleInput', label: 'Jadwal Mengajar', icon: Calendar },
    { id: 'database', label: 'Kelola Database', icon: Database },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileEditor />;
      case 'classes': return <ClassMasterData />;
      case 'students': return <StudentMasterData />;
      case 'subjects': return <SubjectMasterData />;
      case 'scheduleInput': return <ScheduleInputMasterData />;
      case 'database': return <DatabaseManager />;
      default: return <ProfileEditor />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Master Data</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium">Pengaturan dan manajemen basis data aplikasi</p>
        </div>
      </div>

      {/* Modern Glassmorphic Tab Navigation */}
      <div className="bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-md p-1.5 rounded-2xl inline-flex flex-wrap gap-1 border border-gray-200/50 dark:border-gray-800/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative
                ${isActive
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/30'
                }
              `}
            >
              <Icon size={18} className={isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-500 rounded-full blur-[2px] opacity-20 mt-1"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
        {renderContent()}
      </div>
    </div>
  );
}