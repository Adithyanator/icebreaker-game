import { Users } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useState } from 'react';

export default function WaitingLobby({ volunteer, event, onRefresh }) {
  const [joinedCount, setJoinedCount] = useState(event?.joinedCount || 0);

  useSocket('joined:update', (data) => {
    setJoinedCount(data.joinedCount);
  });

  useSocket('event:update', () => {
    onRefresh?.();
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-orange-light to-white px-6 py-8">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome, {volunteer.name}!</h1>
          <p className="mt-1 text-gray-600">{volunteer.centre} Centre</p>
        </div>

        <div className="card mb-4 text-center">
          <p className="text-sm text-gray-500">Your Unique Code</p>
          <p className="mt-1 text-4xl font-bold tracking-widest text-brand-blue">
            {volunteer.code}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Share this code when others find you!
          </p>
        </div>

        <div className="card mb-4 flex items-center justify-between">
          <span className="text-gray-600">Volunteers joined</span>
          <span className="text-2xl font-bold text-brand-orange">{joinedCount}</span>
        </div>

        <div className="rounded-2xl bg-brand-blue-light p-5 text-center">
          <p className="animate-pulse font-medium text-brand-blue">
            Waiting for the moderator to start the game...
          </p>
        </div>
      </div>
    </div>
  );
}
