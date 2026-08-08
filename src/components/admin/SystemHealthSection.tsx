'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function SystemHealthSection() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">System Health Diagnostics</h2>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 w-auto bg-brand-blue"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Check
        </button>
      </div>

      {health && (
        <div
          className={`card border ${
            health.ready
              ? 'border-green-200 bg-green-50/40 text-green-800'
              : 'border-red-200 bg-red-50/40 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            <div>
              <p className="font-extrabold text-base">Pre-event check: {health.status}</p>
              <p className="text-xs opacity-80">
                {health.ready
                  ? 'All pre-event diagnostics passed successfully.'
                  : 'Please address the highlighted issues before starting the event.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {health?.checks && (
        <div className="grid gap-3 sm:grid-cols-2">
          {health.checks.map((check: any, idx: number) => (
            <div
              key={idx}
              className="card border border-gray-100 flex items-start gap-3 p-4"
            >
              {check.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-xs text-gray-900">{check.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
