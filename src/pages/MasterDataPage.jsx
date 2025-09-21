import React, { useState } from 'react';
import StudentMasterData from '../components/StudentMasterData';
import ClassMasterData from '../components/ClassMasterData';
import ScheduleInputMasterData from '../components/ScheduleInputMasterData';
import ProfileEditor from '../components/ProfileEditor';
import SubjectMasterData from '../components/SubjectMasterData'; // Import SubjectMasterData
import DatabaseManager from '../components/DatabaseManager'; // Import DatabaseManager

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'classes', 'students', 'subjects', 'scheduleInput', 'database'

  // Helper component for tabs
  const TabButton = ({ tabKey, label }) => (
    <li className="me-2" role="presentation">
      <button
        className={`inline-block px-5 py-3 border-b-2 rounded-t-lg transition-all duration-300 ease-in-out ${
          activeTab === tabKey
            ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-500 font-semibold bg-purple-50 dark:bg-purple-900/20'
            : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300 dark:text-gray-400 dark:hover:text-purple-500 dark:hover:border-purple-700 hover:bg-gray-100 dark:hover:bg-gray-700/30'
        }`}
        onClick={() => setActiveTab(tabKey)}
        type="button"
        aria-selected={activeTab === tabKey}
      >
        {label}
      </button>
    </li>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileEditor />;
      case 'classes':
        return <ClassMasterData />;
      case 'students':
        return <StudentMasterData />;
      case 'subjects': // New case for subjects
        return <SubjectMasterData />;
      case 'scheduleInput':
        return <ScheduleInputMasterData />;
      case 'database': // New case for database manager
        return <DatabaseManager />;
      default:
        return <ProfileEditor />;
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
      <h2 className="text-xl font-semibold text-purple-800 dark:text-purple-100 mb-4">Master Data / Setting</h2>

      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" id="default-tab" role="tablist">
          <TabButton tabKey="profile" label="Profil" />
          <TabButton tabKey="classes" label="Kelas" />
          <TabButton tabKey="students" label="Siswa" />
          <TabButton tabKey="subjects" label="Mata Pelajaran" /> {/* New Tab Button */}
          <TabButton tabKey="scheduleInput" label="Jadwal Mengajar" />
          <TabButton tabKey="database" label="Kelola Database" /> {/* New Tab Button for Database Manager */}
        </ul>
      </div>

      <div id="default-tab-content">
        {renderContent()}
      </div>
    </div>
  );
}