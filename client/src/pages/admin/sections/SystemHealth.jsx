import { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../../../api';

export default function SystemHealth({ password }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runValidation() {
    setLoading(true);
    try {
      const data = await api.adminRequest('/admin/health', {}, password);
      setResult(data);
    } catch (err) {
      setResult({ ready: false, status: 'NOT READY', checks: [{ name: 'Error', pass: false, message: err.message }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Health</h2>
        <button
          onClick={runValidation}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Run Pre-Event Validation
        </button>
      </div>

      {result && (
        <>
          <div className={`card mb-4 text-center ${
            result.ready ? 'border-2 border-green-300 bg-green-50' : 'border-2 border-red-300 bg-red-50'
          }`}>
            <p className="text-3xl font-bold">{result.status}</p>
            <p className="mt-1 text-sm text-gray-600">
              {result.checks.filter((c) => c.pass).length} / {result.checks.length} checks passed
            </p>
          </div>

          <div className="space-y-2">
            {result.checks.map((check) => (
              <div key={check.name} className="card flex items-start gap-3 py-3">
                {check.pass ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{check.name}</p>
                  {check.message && (
                    <p className="text-sm text-gray-500">{check.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!result && (
        <div className="card text-center text-gray-500">
          Click "Run Pre-Event Validation" to check system readiness.
        </div>
      )}
    </div>
  );
}
