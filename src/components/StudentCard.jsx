
import React, { useState } from 'react';
import { Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import StyledButton from './StyledButton';

const StudentCard = ({ student, onEdit, onDelete }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-lg flex flex-col space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg font-semibold text-text-light dark:text-text-dark">{student.name}</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">NIS: {student.nis}</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Rombel: {student.rombel}</p>
        </div>
        <div className="flex space-x-2">
          <StyledButton onClick={() => onEdit(student)} variant="primary" size="sm"><Edit size={16} className="mr-1" />Edit</StyledButton>
          <StyledButton onClick={() => onDelete(student.id)} variant="danger" size="sm"><Trash2 size={16} /></StyledButton>
        </div>
      </div>
      {showDetails && (
        <div className="text-sm text-text-muted-light dark:text-text-muted-dark border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <p><strong>Kode Siswa:</strong> {student.code}</p>
          <p><strong>NISN:</strong> {student.nisn}</p>
          <p><strong>No. Absen:</strong> {student.absen}</p>
          <p><strong>Jenis Kelamin:</strong> {student.gender}</p>
          <p><strong>Tempat, Tanggal Lahir:</strong> {`${student.birthPlace}, ${student.birthDate}`}</p>
        </div>
      )}
      <div className="flex justify-center">
        <StyledButton onClick={() => setShowDetails(!showDetails)} variant="outline" size="sm">
          {showDetails ? <><ChevronUp size={16} className="mr-1" /> Lebih Sedikit</> : <><ChevronDown size={16} className="mr-1" /> Lebih Banyak</>}
        </StyledButton>
      </div>
    </div>
  );
};

export default StudentCard;
