import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../components/PrimaryButton';
import { checkAuth, legacyLogin } from '../lib/auth';
import { authClient } from '../lib/auth-client';
import { loadOnboarding } from '../lib/storage';

type ToastLevel = 'warning' | 'error';

type ToastItem = {
  id: number;
  message: string;
  level: ToastLevel;
};

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [legacyCode, setLegacyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function pushToast(message: string, level: ToastLevel = 'warning') {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((items) => [...items, { id, message, level }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4200);
  }

  function reportIssue(message: string, level: ToastLevel = 'warning') {
    setError(message);
    pushToast(message, level);
  }

  async function routePostAuth() {
    const check = await checkAuth();
    if (!check.authenticated) {
      reportIssue('Almost there — we could not find your session. Please try again.', 'error');
      return;
    }
    const onboarding = loadOnboarding();
    navigate(onboarding.onboardingCompleted ? '/' : '/onboarding', { replace: true });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (authMode === 'sign_up' && password.length < 8) {
      reportIssue('Use at least 8 characters for your password so your account stays secure.');
      return;
    }
    setLoading(true);
    const inferredNameFromEmail = email.split('@')[0]?.trim();
    const signUpName = name.trim() || inferredNameFromEmail || 'Tempo Athlete';
    const result =
      authMode === 'sign_up'
        ? await authClient.signUp.email({
            email,
            password,
            name: signUpName,
            callbackURL: '/',
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: '/',
          });
    setLoading(false);
    if ((result as { error?: { message?: string } }).error) {
      const message =
        (result as { error?: { message?: string } }).error?.message ??
        (authMode === 'sign_up'
          ? 'We could not create your account. Check your details and try again.'
          : 'Those details did not match. Try again.');
      reportIssue(message, 'error');
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
      reportIssue(result.error ?? 'That access code did not work. Please try again.', 'error');
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
    reportIssue(maybeErr ?? 'Apple sign-in is not configured yet. Use email for now.', 'warning');
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(19,48,70,0.16)] backdrop-blur-sm ${
              toast.level === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-700'
                : 'border-amber-200 bg-amber-50/95 text-amber-800'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
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
              setAuthMode('sign_in');
            }}
            disabled={loading}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
          >
            Continue with email
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmailForm(true);
              setShowLegacyForm(false);
              setAuthMode('sign_up');
            }}
            disabled={loading}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
          >
            Create account
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
            {authMode === 'sign_up' && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-muted">
                  Name (optional)
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  placeholder="Your name"
                />
              </div>
            )}
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
                autoComplete={authMode === 'sign_up' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                placeholder="Your password"
                minLength={authMode === 'sign_up' ? 8 : undefined}
                required
              />
            </div>
            {authMode === 'sign_up' && (
              <p className="text-xs text-muted">Use at least 8 characters.</p>
            )}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading || !email || !password}>
              {loading
                ? authMode === 'sign_up'
                  ? 'Creating account…'
                  : 'Signing in…'
                : authMode === 'sign_up'
                  ? 'Create account'
                  : 'Continue'}
            </PrimaryButton>
            <button
              type="button"
              onClick={() =>
                setAuthMode((m) => (m === 'sign_in' ? 'sign_up' : 'sign_in'))
              }
              className="w-full rounded-xl px-3 py-1 text-sm font-medium text-muted underline"
            >
              {authMode === 'sign_up'
                ? 'Already have an account? Continue with email'
                : "Need an account? Create one"}
            </button>
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
