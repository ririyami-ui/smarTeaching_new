import React from 'react';
import { Bell } from 'lucide-react';
import './RunningText.css';

interface RunningTextProps {
  text: string;
}

const RunningText: React.FC<RunningTextProps> = ({ text }) => {
  return (
    <div className="running-text-container group">
      <div className="running-text-icon">
        <Bell size={18} className="animate-bounce" />
      </div>
      <div className="running-text-wrapper">
        <div className="running-text">{text}</div>
      </div>
    </div>
  );
};

export default RunningText;

