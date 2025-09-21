import React, { useState } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import StyledButton from './StyledButton';

const ClassCard = ({ classItem, onEdit, onDelete }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-lg flex flex-col space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg font-semibold text-text-light dark:text-text-dark">{classItem.code}</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Tingkat: {classItem.level}</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Rombel: {classItem.rombel}</p>
        </div>
        <div className="flex space-x-2">
          <StyledButton onClick={() => onEdit(classItem)} variant="primary" size="sm"><Pencil size={16} /></StyledButton>
          <StyledButton onClick={() => onDelete(classItem.id)} variant="danger" size="sm"><Trash2 size={16} /></StyledButton>
        </div>
      </div>
      {showDetails && (
        <div className="text-sm text-text-muted-light dark:text-text-muted-dark border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <p><strong>Keterangan:</strong> {classItem.description || '-'}</p>
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

export default ClassCard;
