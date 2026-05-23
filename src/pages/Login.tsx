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
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Training</h1>
        <p className="mt-2 text-sm text-muted">Sign in to use your plan and coach.</p>

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
              className="w-full min-h-[48px] rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
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
          Password is set on the server — never in this repo.
        </p>
      </div>
    </div>
  );
}
