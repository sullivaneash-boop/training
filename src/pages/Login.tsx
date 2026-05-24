import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../components/PrimaryButton';
import { checkAuth, legacyLogin } from '../lib/auth';
import { authClient } from '../lib/auth-client';
import { loadOnboarding } from '../lib/storage';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legacyCode, setLegacyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showLegacyForm, setShowLegacyForm] = useState(false);

  async function routePostAuth() {
    const check = await checkAuth();
    if (!check.authenticated) {
      setError('Sign-in completed but no session was found.');
      return;
    }
    const onboarding = loadOnboarding();
    navigate(onboarding.onboardingCompleted ? '/' : '/onboarding', { replace: true });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: '/',
    });
    setLoading(false);
    if ((result as { error?: { message?: string } }).error) {
      setError((result as { error?: { message?: string } }).error?.message ?? 'Invalid credentials');
      return;
    }
    await routePostAuth();
  }

  async function handleLegacySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await legacyLogin(legacyCode);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Invalid access code');
    } else {
      await routePostAuth();
    }
  }

  async function handleAppleSignIn() {
    setError('');
    setLoading(true);
    const result = await authClient.signIn.social({
      provider: 'apple',
      callbackURL: '/',
    });
    setLoading(false);
    const maybeUrl = (result as { data?: { url?: string }; url?: string }).data?.url ?? (result as { url?: string }).url;
    if (maybeUrl) {
      window.location.href = maybeUrl;
      return;
    }
    const maybeErr = (result as { error?: { message?: string } }).error?.message;
    setError(maybeErr ?? 'Apple sign-in is not configured yet.');
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_32px_rgba(19,48,70,0.08)]">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">TEMPO</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="mt-2 text-sm text-muted">Choose a sign-in method to continue your setup.</p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={loading}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
          >
            Continue with Apple
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmailForm(true);
              setShowLegacyForm(false);
            }}
            disabled={loading}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
          >
            Continue with email
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLegacyForm(true);
              setShowEmailForm(false);
            }}
            disabled={loading}
            className="w-full rounded-xl px-3 py-1 text-sm font-medium text-muted underline"
          >
            Sign in with access code
          </button>
        </div>

        {showEmailForm && (
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                placeholder="Your password"
                required
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading || !email || !password}>
              {loading ? 'Signing in…' : 'Continue'}
            </PrimaryButton>
          </form>
        )}

        {showLegacyForm && (
          <form onSubmit={handleLegacySubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="legacy-code" className="mb-1.5 block text-sm font-medium text-muted">
                Legacy access code
              </label>
              <input
                id="legacy-code"
                type="password"
                autoComplete="current-password"
                value={legacyCode}
                onChange={(e) => setLegacyCode(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                placeholder="Enter legacy APP_PASSWORD code"
                required
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading || !legacyCode}>
              {loading ? 'Signing in…' : 'Continue'}
            </PrimaryButton>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Better Auth manages your session. Legacy access code remains available while migrating.
        </p>
      </div>
    </div>
  );
}
