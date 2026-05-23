import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(password);
    setLoading(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error ?? 'Invalid password');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to use your plan and coach.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#4a53ff] focus:outline-none"
              placeholder="Your app password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-2xl bg-[#4a53ff] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          Password is set on the server — never in this repo.
        </p>
      </div>
    </div>
  );
}
