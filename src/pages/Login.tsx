import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../components/PrimaryButton';
import { LandingPage } from '../components/landing/LandingPage';
import { checkAuth, legacyLogin } from '../lib/auth';
import { authClient } from '../lib/auth-client';
import { loadOnboarding } from '../lib/storage';

type ToastLevel = 'warning' | 'error';

type ToastItem = {
  id: number;
  message: string;
  level: ToastLevel;
};

type AuthResultError = {
  message?: string;
  status?: number;
  statusText?: string;
  code?: string;
};

function readAuthError(err: AuthResultError | undefined, mode: 'sign_in' | 'sign_up'): string | undefined {
  if (!err) return undefined;
  const message = err.message?.trim();
  if (message) return message;

  const code = (err.code ?? '').toLowerCase();
  const statusText = (err.statusText ?? '').toLowerCase();

  if (err.status === 403 || code.includes('disable') || statusText.includes('forbidden')) {
    return mode === 'sign_up'
      ? 'New account creation is currently disabled. Ask support to enable signups.'
      : 'Sign-in is currently restricted. Please try again in a moment.';
  }
  if (err.status === 409 || code.includes('exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (err.status === 422 || err.status === 400 || code.includes('invalid')) {
    return mode === 'sign_up'
      ? 'Please enter a valid email and a password with at least 8 characters.'
      : 'Please check your email and password and try again.';
  }
  if (err.status && err.status >= 500) {
    return 'Auth service is temporarily unavailable. Please try again shortly.';
  }
  return undefined;
}

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
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const authPanelRef = useRef<HTMLDivElement | null>(null);

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
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (authMode === 'sign_up' && trimmedPassword.length < 8) {
      reportIssue('Use at least 8 characters for your password so your account stays secure.');
      return;
    }
    if (!trimmedEmail) {
      reportIssue('Enter a valid email address.');
      return;
    }

    setLoading(true);
    const inferredNameFromEmail = trimmedEmail.split('@')[0]?.trim();
    const signUpName = trimmedName || inferredNameFromEmail || 'Tempo Athlete';

    let result:
      | Awaited<ReturnType<typeof authClient.signUp.email>>
      | Awaited<ReturnType<typeof authClient.signIn.email>>;
    try {
      result =
        authMode === 'sign_up'
          ? await authClient.signUp.email({
              email: trimmedEmail,
              password: trimmedPassword,
              name: signUpName,
            })
          : await authClient.signIn.email({
              email: trimmedEmail,
              password: trimmedPassword,
            });
    } catch {
      setLoading(false);
      reportIssue('Auth request failed before reaching the server. Please try again.', 'error');
      return;
    }
    setLoading(false);
    if ((result as { error?: AuthResultError }).error) {
      const authError = (result as { error?: AuthResultError }).error;
      const message =
        readAuthError(authError, authMode) ??
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

  useEffect(() => {
    if (!showAuthPanel) return;
    const timeout = window.setTimeout(() => {
      authPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 70);
    return () => window.clearTimeout(timeout);
  }, [showAuthPanel]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#f7f7f4] px-5 pb-10 pt-safe-top">
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
      <div className="mx-auto w-full max-w-md">
        <LandingPage
          onGetStarted={() => {
            setShowAuthPanel(true);
            setShowEmailForm(false);
            setShowLegacyForm(false);
            setError('');
          }}
        />

        {showAuthPanel && (
          <div
            ref={authPanelRef}
            className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_32px_rgba(19,48,70,0.08)]"
          >
            <p className="text-sm font-semibold tracking-[0.14em] text-muted">ACCOUNT</p>
            <p className="mt-1 text-sm text-muted">Choose a sign-in method to continue your setup.</p>

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
        )}
      </div>
    </div>
  );
}
