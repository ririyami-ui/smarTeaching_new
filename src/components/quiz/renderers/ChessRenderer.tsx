import React from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export interface ChessConfig {
  type: 'chess';
  fen: string;
  arrows?: Array<[string, string]>; // e.g., [['e2', 'e4']]
}

const ChessRenderer: React.FC<{ config: ChessConfig }> = ({ config }) => {
  // Validate FEN or use start position if invalid
  let validFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  try {
    const chess = new Chess(config.fen);
    validFen = chess.fen();
  } catch (e) {
    console.error("Invalid FEN provided to ChessRenderer:", config.fen);
  }

  const customArrows = config.arrows || [];

  return (
    <div className="my-4 flex flex-col items-center">
      <div className="w-full max-w-[350px] md:max-w-[400px] border-4 border-gray-800 rounded-md overflow-hidden shadow-xl">
        <Chessboard 
          position={validFen} 
          arePiecesDraggable={false}
          customArrows={customArrows}
          customDarkSquareStyle={{ backgroundColor: '#779556' }}
          customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 font-mono text-center break-all px-4">
        FEN: {validFen}
      </div>
    </div>
  );
};

export default ChessRenderer;
