import React from 'react';
import { Bell } from 'lucide-react';
import './RunningText.css';

const RunningText = ({ text }) => {
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
