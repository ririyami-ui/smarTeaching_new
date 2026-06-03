import React from 'react';

export interface SpreadsheetConfig {
  type: 'spreadsheet';
  title?: string;
  formulaBar?: string;
  selectedCell?: string; // e.g. "C3"
  data: string[][];      // 2D grid
}

// Convert 0 -> A, 1 -> B, etc.
function getColumnLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Check if cell matches selected cell coordinate (e.g., "B2")
const isCellSelected = (colIndex: number, rowIndex: number, selected: string | undefined): boolean => {
  if (!selected) return false;
  const colLetter = getColumnLetter(colIndex);
  const rowNumber = rowIndex + 1;
  return `${colLetter}${rowNumber}`.toUpperCase() === selected.toUpperCase();
};

const SpreadsheetRenderer: React.FC<{ config: SpreadsheetConfig }> = ({ config }) => {
  const { title = 'Workbook.xlsx', formulaBar = '', selectedCell = 'A1', data = [] } = config;
  const colCount = data.length > 0 ? data[0].length : 0;

  return (
    <div className="my-4 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-900 font-mono text-xs">
      {/* Excel Ribbon-style Header */}
      <div className="bg-[#107c41] px-4 py-2 text-white flex items-center justify-between font-sans">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white text-[#107c41] rounded flex items-center justify-center font-bold text-sm">
            X
          </div>
          <span className="font-semibold">{title} - Excel</span>
        </div>
        <div className="flex items-center gap-1 opacity-75 text-[10px]">
          <span>Mode Pratinjau Soal</span>
        </div>
      </div>

      {/* Formula Bar Section */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-1 gap-1 font-sans">
        {/* Name Box */}
        <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 min-w-[50px] text-center rounded font-semibold text-gray-700 dark:text-gray-300">
          {selectedCell}
        </div>
        
        {/* Separator / Divider */}
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
        
        {/* fx symbol */}
        <div className="text-gray-400 font-serif italic font-bold px-1 select-none">
          fx
        </div>

        {/* Formula Bar Input */}
        <div className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 min-h-[22px] flex items-center">
          {formulaBar}
        </div>
      </div>

      {/* Grid container */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 select-none">
              {/* Corner Cell */}
              <th className="border border-gray-300 dark:border-gray-700 w-10 text-center bg-gray-200 dark:bg-gray-900 h-6"></th>
              {/* Column Letters */}
              {Array.from({ length: colCount }).map((_, i) => (
                <th key={i} className="border border-gray-300 dark:border-gray-700 px-2 text-center font-normal min-w-[80px]">
                  {getColumnLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {/* Row Numbers */}
                <td className="border border-gray-300 dark:border-gray-700 text-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-sans font-medium h-6 select-none">
                  {rowIndex + 1}
                </td>
                
                {/* Cells */}
                {row.map((cellValue, colIndex) => {
                  const selected = isCellSelected(colIndex, rowIndex, selectedCell);
                  return (
                    <td
                      key={colIndex}
                      className={`border border-gray-200 dark:border-gray-800 px-2 py-1 text-left relative min-w-[80px] truncate max-w-[150px] ${
                        selected 
                          ? 'outline outline-2 outline-[#107c41] -outline-offset-1 bg-green-50/30 dark:bg-green-950/10'
                          : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {cellValue}
                      
                      {/* Active cell bottom right square */}
                      {selected && (
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[#107c41] border border-white dark:border-gray-900 z-10"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpreadsheetRenderer;
