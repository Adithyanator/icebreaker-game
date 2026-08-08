'use client';

import { useState, useEffect } from 'react';
import { Check, Trophy } from 'lucide-react';
import CellEntryModal from './CellEntryModal';
import type { VolunteerPublic } from '@/types/database';

interface GameBoardProps {
  volunteer: VolunteerPublic;
  onUpdate: () => void;
  onBingo: () => void;
}

const BINGO_HEADERS = ['B', 'I', 'N', 'G', 'O'];

const BINGO_LINES = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals (Cross)
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export default function GameBoard({ volunteer, onUpdate, onBingo }: GameBoardProps) {
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [hasNotifiedBingo, setHasNotifiedBingo] = useState(false);

  const completedIndices = (volunteer.entries || []).map((e) => Number(e.cell_index));
  const completedSet = new Set(completedIndices);

  // Count total 5-cell lines completed (rows, columns, diagonals cross)
  const completedLinesCount = BINGO_LINES.filter((line) =>
    line.every((idx) => completedSet.has(idx))
  ).length;

  // Game is completed only when at least 5 lines are completed!
  const isFullBingoAchieved = completedLinesCount >= 5;

  useEffect(() => {
    if (isFullBingoAchieved && !hasNotifiedBingo) {
      setShowBingoModal(true);
      setHasNotifiedBingo(true);
      onBingo();
    }
  }, [isFullBingoAchieved, hasNotifiedBingo, onBingo]);

  return (
    <div className="w-full max-w-sm">
      {/* Header Info */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{volunteer.name}</p>
          <p className="text-sm text-gray-500">
            {volunteer.centre} · Code <span className="font-mono font-bold text-gray-700">{volunteer.code}</span>
          </p>
        </div>
        <div className="rounded-xl bg-brand-blue-light px-3 py-1.5 text-sm font-semibold text-brand-blue flex items-center gap-1.5">
          {isFullBingoAchieved && <Trophy className="h-4 w-4 text-amber-500" />}
          <span>{completedSet.size} / 25 Cells</span>
        </div>
      </div>

      {/* B-I-N-G-O Letters on Top - Each letter ticks green when a line is completed */}
      <div className="mb-3 grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
        {BINGO_HEADERS.map((letter, index) => {
          const isTicked = index < completedLinesCount;
          return (
            <div
              key={letter}
              className={`relative flex items-center justify-center py-2 text-xl font-black tracking-wider rounded-xl transition-all duration-300 ${
                isTicked
                  ? 'bg-green-500 text-white shadow-md scale-105 border-2 border-green-400'
                  : 'bg-white text-gray-400 border border-gray-200'
              }`}
            >
              <span>{letter}</span>
              {isTicked && (
                <Check className="absolute bottom-1 right-1 h-3.5 w-3.5 text-white" strokeWidth={3} />
              )}
            </div>
          );
        })}
      </div>

      {/* Lines Completed Progress Tracker */}
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-gray-600 px-1">
        <span>BINGO Lines Completed:</span>
        <span className="text-brand-orange font-bold text-sm">
          {completedLinesCount} / 5 Lines
        </span>
      </div>

      {/* 5x5 BINGO Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {volunteer.board?.map((letter, index) => {
          const done = completedSet.has(index);
          return (
            <button
              key={index}
              onClick={() => !done && setActiveCell(index)}
              disabled={done}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xl sm:text-2xl font-bold shadow-xs transition ${
                done
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-100'
              } ${!done ? 'active:scale-95' : ''}`}
            >
              {letter}
              {done && (
                <Check className="absolute bottom-1 right-1 h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        Complete 5 rows/columns/crosses to fill all B-I-N-G-O letters and achieve BINGO!
      </p>

      {/* Cell Entry Modal */}
      {activeCell !== null && volunteer.board && (
        <CellEntryModal
          cellIndex={activeCell}
          letter={volunteer.board[activeCell]}
          onClose={() => setActiveCell(null)}
          onSuccess={(result) => {
            onUpdate();
            setActiveCell(null);
            if (result.isBingo) {
              setShowBingoModal(true);
              onBingo();
            }
          }}
        />
      )}

      {/* BINGO Pop-up Celebration Modal */}
      {showBingoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in zoom-in-95">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl animate-bounce">
              🎉
            </div>
            <h2 className="text-3xl font-black tracking-wider text-amber-500">BINGO COMPLETED!</h2>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Congratulations, {volunteer.name}! You completed all 5 BINGO lines!
            </p>
            {volunteer.completionPosition && (
              <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 py-1.5 px-3 rounded-full inline-block">
                Rank #{volunteer.completionPosition} on the Official Leaderboard!
              </p>
            )}
            <button
              onClick={() => setShowBingoModal(false)}
              className="mt-6 btn-primary w-full py-3 text-sm font-bold"
            >
              Awesome! Continue Playing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
