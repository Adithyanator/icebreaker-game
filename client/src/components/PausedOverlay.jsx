import { Pause } from 'lucide-react';

export default function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="card max-w-sm text-center">
        <Pause className="mx-auto mb-3 h-12 w-12 text-brand-orange" />
        <h2 className="text-xl font-bold">Game Paused</h2>
        <p className="mt-2 text-gray-600">
          The moderator has paused the game. Please wait...
        </p>
      </div>
    </div>
  );
}
