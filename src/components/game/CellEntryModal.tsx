'use client';

import { useState, useEffect } from 'react';
import { X, User, MapPin, Key, CheckCircle2 } from 'lucide-react';
import { submitCellEntryAction } from '@/actions/game-actions';

interface CellEntryModalProps {
  cellIndex: number;
  letter: string;
  onClose: () => void;
  onSuccess: (result: { isBingo?: boolean; completionPosition?: number }) => void;
}

export default function CellEntryModal({
  cellIndex,
  letter,
  onClose,
  onSuccess,
}: CellEntryModalProps) {
  const [name, setName] = useState('');
  const [centre, setCentre] = useState('');
  const [code, setCode] = useState('');
  const [centres, setCentres] = useState<string[]>([
    'KP English',
    'KP Tution',
    'PB',
    'VB',
    'EJ',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/event')
      .then((res) => res.json())
      .then((data) => {
        if (data.centres && Array.isArray(data.centres) && data.centres.length > 0) {
          setCentres(data.centres);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !centre || !code.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const volId =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('volunteer_id') || localStorage.getItem('volunteer_id')
          : null;

      const response = await fetch('/api/game/cell-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(volId ? { 'x-volunteer-id': volId } : {}),
        },
        body: JSON.stringify({
          cellIndex,
          name,
          centre,
          code,
          volunteerId: volId,
        }),
      });

      const res = await response.json();

      if (!response.ok || !res.ok) {
        setError(res.error || 'Invalid partner entry.');
      } else {
        onSuccess({
          isBingo: res.isBingo,
          completionPosition: res.completionPosition,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting entry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-2xl font-extrabold text-white">
              {letter}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Cell #{cellIndex + 1}</h3>
              <p className="text-xs text-gray-500">
                Find someone starting with <span className="font-bold text-brand-orange">{letter}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Partner Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Name starting with ${letter}`}
                className="input-field pl-10 text-sm py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="label">Centre</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <select
                required
                value={centre}
                onChange={(e) => setCentre(e.target.value)}
                className="input-field pl-10 text-sm py-2.5 appearance-none bg-white"
              >
                <option value="">Select centre</option>
                {centres.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">3-Digit Verification Code</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ask partner for 3-digit code"
                className="input-field pl-10 text-sm py-2.5 font-mono tracking-wider"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-2/3 py-3 text-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
