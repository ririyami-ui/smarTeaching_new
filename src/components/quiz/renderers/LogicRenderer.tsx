const LogicRenderer: React.FC<{ config: any }> = ({ config }) => {
  const code = (config.code || "").toUpperCase();
  
  // Deteksi Gerbang Utama
  const isAND = code.includes("AND");
  const isOR = code.includes("OR");
  const isNOT = code.includes("NOT") || code.includes("-> NOT");
  
  return (
    <div className="my-4 p-8 border-2 border-blue-100 rounded-3xl bg-white flex flex-col items-center shadow-inner overflow-hidden">
      <svg width="400" height="150" viewBox="0 0 400 150" className="drop-shadow-sm">
        {/* INPUTS */}
        <text x="10" y="45" fontSize="10" fontWeight="bold" fill="#64748b">IN A</text>
        <line x1="45" y1="40" x2="100" y2="40" stroke="#94a3b8" strokeWidth="2" />
        
        <text x="10" y="105" fontSize="10" fontWeight="bold" fill="#64748b">IN B</text>
        <line x1="45" y1="100" x2="100" y2="100" stroke="#94a3b8" strokeWidth="2" />

        {/* GATE 1 (AND / OR) */}
        {isOR ? (
          <path d="M 100 30 Q 120 30 150 70 Q 120 110 100 110 Q 120 70 100 30 Z" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="3" />
        ) : (
          <path d="M 100 30 L 130 30 A 40 40 0 0 1 130 110 L 100 110 Z" fill="#eff6ff" stroke="#2563eb" strokeWidth="3" />
        )}
        <text x="110" y="75" fontSize="12" fontWeight="black" fill={isOR ? "#0ea5e9" : "#2563eb"}>{isOR ? "OR" : "AND"}</text>

        {/* INTERMEDIATE LINE */}
        <line x1="160" y1="70" x2="220" y2="70" stroke="#94a3b8" strokeWidth="2" />

        {/* GATE 2 (NOT - OPTIONAL) */}
        {isNOT && (
          <>
            <path d="M 220 50 L 255 70 L 220 90 Z" fill="#fff1f2" stroke="#f43f5e" strokeWidth="3" />
            <circle cx="260" cy="70" r="5" fill="white" stroke="#f43f5e" strokeWidth="2" />
            <text x="225" y="110" fontSize="10" fontWeight="bold" fill="#f43f5e">NOT</text>
            <line x1="265" y1="70" x2="310" y2="70" stroke="#94a3b8" strokeWidth="2" />
          </>
        )}
        
        {!isNOT && <line x1="160" y1="70" x2="310" y2="70" stroke="#94a3b8" strokeWidth="2" />}

        {/* OUTPUT */}
        <rect x="310" y="55" width="70" height="30" rx="8" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
        <text x="325" y="75" fontSize="11" fontWeight="bold" fill="#1e293b">OUT Y</text>
      </svg>
      <div className="mt-4 px-4 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-widest">
        {isAND && isNOT ? "Gerbang NAND" : isOR && isNOT ? "Gerbang NOR" : isAND ? "Gerbang AND" : isOR ? "Gerbang OR" : "Rangkaian Logika"}
      </div>
    </div>
  );
};

export default LogicRenderer;
