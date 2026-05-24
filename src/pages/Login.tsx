import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../components/PrimaryButton';
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_32px_rgba(19,48,70,0.08)]">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">TEMPO</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Welcome back.</h1>
        <p className="mt-2 text-sm text-muted">Sign in to open your daily brief and plan tools.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              placeholder="Your app password"
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <PrimaryButton type="submit" disabled={loading || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Password is stored server-side and never committed to this repo.
        </p>
      </div>
    </div>
  );
}
