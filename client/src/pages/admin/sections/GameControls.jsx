import { useState } from 'react';
import { Play, Pause, Eye, RotateCcw, Grid3x3 } from 'lucide-react';
import { api } from '../../../api';

export default function GameControls({ data, password, onRefresh }) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);

  const status = data?.event?.status || 'setup';

  async function action(name, path, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setLoading(name);
    setError('');
    try {
      await api.adminRequest(path, { method: 'POST' }, password);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function checkHealth() {
    try {
      const result = await api.adminRequest('/admin/health', {}, password);
      setHealth(result);
    } catch (err) {
      setError(err.message);
    }
  }

  const buttons = [
    {
      id: 'boards',
      label: 'Generate All Boards',
      icon: Grid3x3,
      path: '/admin/generate-boards',
      disabled: status !== 'setup',
      confirm: 'Generate boards for all volunteers?',
      color: 'bg-brand-blue',
    },
    {
      id: 'start',
      label: 'Start Event',
      icon: Play,
      path: '/admin/start-event',
      disabled: status !== 'setup',
      color: 'bg-green-600',
    },
    {
      id: 'pause',
      label: 'Pause Event',
      icon: Pause,
      path: '/admin/pause-event',
      disabled: status !== 'active',
      color: 'bg-yellow-500',
    },
    {
      id: 'resume',
      label: 'Resume Event',
      icon: Play,
      path: '/admin/resume-event',
      disabled: status !== 'paused',
      color: 'bg-green-600',
    },
    {
      id: 'reveal',
      label: 'Reveal Teams',
      icon: Eye,
      path: '/admin/reveal-teams',
      disabled: status === 'setup' || status === 'revealed',
      confirm: 'Reveal team colors to all volunteers?',
      color: 'bg-purple-600',
    },
    {
      id: 'reset',
      label: 'Reset Event',
      icon: RotateCcw,
      path: '/admin/reset-event',
      confirm: 'EMERGENCY RESET: This will clear all progress, boards, and reset the event. Are you sure?',
      color: 'bg-red-600',
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Game Controls</h2>

      <div className="card mb-4">
        <p className="text-sm text-gray-500">Current Status</p>
        <p className="text-xl font-bold capitalize">{status}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {buttons.map(({ id, label, icon: Icon, path, disabled, confirm, color }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'start') checkHealth().then(() => action(id, path));
              else action(id, path, confirm);
            }}
            disabled={disabled || loading === id}
            className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-white transition disabled:opacity-40 ${color}`}
          >
            <Icon className="h-5 w-5" />
            {loading === id ? 'Working...' : label}
          </button>
        ))}
      </div>

      {health && status === 'setup' && (
        <div className={`mt-4 rounded-xl p-4 ${health.ready ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`font-semibold ${health.ready ? 'text-green-700' : 'text-red-700'}`}>
            Pre-event check: {health.status}
          </p>
          {!health.ready && (
            <p className="mt-1 text-sm text-red-600">
              Fix issues in System Health before starting.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 card text-sm text-gray-600">
        <p className="font-medium text-gray-800">Flow Guide</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Add and verify all volunteers</li>
          <li>Generate boards for everyone</li>
          <li>Run pre-event validation</li>
          <li>Start the event</li>
          <li>Monitor live progress</li>
          <li>Reveal teams when most have finished</li>
        </ol>
      </div>
    </div>
  );
}
