import { Pause } from 'lucide-react';

export default function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-xs">
      <div className="card max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
          <Pause className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Event Paused</h2>
        <p className="text-sm text-gray-500">
          The moderator has temporarily paused the game. Please hold on!
        </p>
      </div>
    </div>
  );
}
