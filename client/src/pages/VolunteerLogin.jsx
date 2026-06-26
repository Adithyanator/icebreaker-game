import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api, setStoredVolunteer } from '../api';
import { CENTRES } from '../constants';

export default function VolunteerLogin() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [centre, setCentre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [centresList, setCentresList] = useState(CENTRES);

  useEffect(() => {
    api.getEvent()
      .then((data) => {
        if (data.centres) setCentresList(data.centres);
      })
      .catch(() => {});
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.volunteerLogin(name, centre);
      if (data.multiple) {
        setCandidates(data.volunteers);
        setLoading(false);
        return;
      }
      setStoredVolunteer(data.volunteer);
      navigate('/game');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id) {
    setLoading(true);
    setError('');
    try {
      const data = await api.volunteerSelect(id);
      setStoredVolunteer(data.volunteer);
      navigate('/game');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (candidates) {
    return (
      <div className="min-h-screen px-6 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="card mx-auto max-w-sm">
          <h2 className="mb-2 text-xl font-bold">Multiple matches found</h2>
          <p className="mb-4 text-sm text-gray-600">
            Please select your profile or ask the moderator to make names unique.
          </p>
          <div className="space-y-2">
            {candidates.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelect(v.id)}
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-blue hover:bg-brand-blue-light"
              >
                <p className="font-semibold">{v.name}</p>
                <p className="text-sm text-gray-500">{v.centre} · Code ending in {v.code.slice(-1)}</p>
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="card mx-auto max-w-sm">
        <h2 className="mb-1 text-2xl font-bold">Welcome!</h2>
        <p className="mb-6 text-gray-600">Enter your details to join the game.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Your Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              autoComplete="name"
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
              <option value="">Select your centre</option>
              {centresList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
