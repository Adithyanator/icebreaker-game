import { useState } from 'react';
import { Check } from 'lucide-react';
import CellEntryModal from './CellEntryModal';

export default function GameBoard({ volunteer, onUpdate }) {
  const [activeCell, setActiveCell] = useState(null);
  const completedSet = new Set(volunteer.entries?.map((e) => e.cellIndex) || []);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">{volunteer.name}</p>
            <p className="text-sm text-gray-500">{volunteer.centre} · Code {volunteer.code}</p>
          </div>
          <div className="rounded-xl bg-brand-blue-light px-3 py-1.5 text-sm font-semibold text-brand-blue">
            {completedSet.size + 1} / 25
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {volunteer.board?.map((letter, index) => {
            const isFreeSpace = index === 12;
            const done = isFreeSpace || completedSet.has(index);
            return (
              <button
                key={index}
                onClick={() => !done && setActiveCell(index)}
                disabled={done}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xl sm:text-2xl font-bold shadow-xs transition ${
                  isFreeSpace
                    ? 'bg-amber-500 text-white'
                    : done
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-100'
                } ${!done ? 'active:scale-95' : ''}`}
              >
                {isFreeSpace ? (
                  <>
                    <span className="text-xl sm:text-2xl">★</span>
                    <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider leading-none mt-0.5">Free</span>
                  </>
                ) : (
                  letter
                )}
                {done && (
                  <Check className="absolute bottom-1 right-1 h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Tap a letter to find a volunteer whose name starts with it
        </p>
      </div>

      {activeCell !== null && (
        <CellEntryModal
          cellIndex={activeCell}
          letter={volunteer.board[activeCell]}
          volunteerId={volunteer.id}
          onClose={() => setActiveCell(null)}
          onSuccess={(updated) => {
            onUpdate(updated);
            setActiveCell(null);
          }}
        />
      )}
    </div>
  );
}
