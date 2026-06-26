import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../api';
import { CENTRES } from '../constants';

export default function CellEntryModal({ cellIndex, letter, volunteerId, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [centre, setCentre] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [centresList, setCentresList] = useState(CENTRES);

  useEffect(() => {
    api.getEvent()
      .then((data) => {
        if (data.centres) setCentresList(data.centres);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.submitCell(volunteerId, {
        cellIndex,
        name: name.trim(),
        centre,
        code: code.trim(),
      });
      onSuccess(data.volunteer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Find a Volunteer</h3>
            <p className="text-sm text-gray-500">
              Name must start with <span className="font-bold text-brand-orange">{letter}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Found volunteer name</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Name starting with ${letter}`}
              required
            />
          </div>

          <div>
            <label className="label">Centre</label>
            <select
              className="input-field"
              value={centre}
              onChange={(e) => setCentre(e.target.value)}
              required
            >
              <option value="">Select centre</option>
              {centresList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Unique code</label>
            <input
              className="input-field"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="3-digit code"
              inputMode="numeric"
              maxLength={3}
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            className="btn-primary flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
