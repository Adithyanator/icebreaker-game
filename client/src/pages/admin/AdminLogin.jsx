import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PASSWORD_KEY } from '../../constants';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.adminLogin(password);
      sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-light">
          <Lock className="h-6 w-6 text-brand-blue" />
        </div>
        <h2 className="mb-1 text-2xl font-bold">Moderator Login</h2>
        <p className="mb-6 text-gray-600">Enter the admin password to continue.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="input-field mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
          />
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
