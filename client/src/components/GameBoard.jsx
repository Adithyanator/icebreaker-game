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
            {volunteer.progress} / 9
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {volunteer.board?.map((letter, index) => {
            const done = completedSet.has(index);
            return (
              <button
                key={index}
                onClick={() => !done && setActiveCell(index)}
                disabled={done}
                className={`relative flex aspect-square items-center justify-center rounded-2xl text-3xl font-bold shadow-sm transition active:scale-95 ${
                  done
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {letter}
                {done && (
                  <Check className="absolute bottom-2 right-2 h-5 w-5" strokeWidth={3} />
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
