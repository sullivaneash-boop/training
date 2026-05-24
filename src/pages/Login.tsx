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
  const [showAuthPanel, setShowAuthPanel] = useState(false);
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
    <div className="relative min-h-dvh overflow-x-hidden bg-[#f6f7f3] px-5 pb-10 pt-safe-top">
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
        <div className="pointer-events-none absolute inset-x-0 top-20 h-72 bg-[radial-gradient(circle_at_50%_10%,rgba(53,160,108,0.12),transparent_58%)]" />
        <div className="relative">
          <p className="pt-7 text-[0.88rem] font-semibold tracking-[0.35em] text-[#71808f]">TEMPO</p>
          <h1 className="mt-3 max-w-[13ch] text-5xl font-semibold tracking-tight text-[#101826]">
            Know how to train today.
          </h1>
          <p className="mt-4 max-w-[31ch] text-[1.05rem] leading-relaxed text-[#5d6b77]">
            Tempo turns your health and training data into a daily briefing on readiness, recovery,
            and what to do next.
          </p>
        </div>

        <div className="relative mt-8 rounded-[2.3rem] border border-[#e8ece7] bg-[#fbfcf9] px-5 pb-6 pt-5 shadow-[0_16px_40px_rgba(27,54,80,0.12)]">
          <div className="absolute -left-6 top-20 w-28 rounded-2xl border border-[#e7ece8] bg-white p-3 shadow-[0_8px_24px_rgba(32,53,72,0.08)]">
            <p className="text-[0.68rem] font-semibold text-[#5e6e7a]">Sleep</p>
            <p className="mt-1 text-xl font-semibold text-[#182230]">7h 42m</p>
            <p className="text-xs font-medium text-[#3b9b65]">Good</p>
          </div>
          <div className="absolute -right-6 top-9 w-28 rounded-2xl border border-[#e7ece8] bg-white p-3 shadow-[0_8px_24px_rgba(32,53,72,0.08)]">
            <p className="text-[0.68rem] font-semibold text-[#5e6e7a]">Recovery</p>
            <p className="mt-1 text-3xl font-semibold text-[#182230]">78%</p>
            <p className="text-xs font-medium text-[#3b9b65]">Good</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-[#182230]">Daily Briefing</p>
            <p className="text-xs text-[#7b8894]">May 12</p>
          </div>
          <div className="mt-4 rounded-2xl border border-[#e7ece7] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-[#e4f2e8] border-r-[#67b97c] border-t-[#67b97c]">
                <span className="text-xl font-semibold text-[#182230]">85</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2c9a5e]">Ready to train</p>
                <p className="text-sm text-[#677582]">Your body is primed for quality work today.</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[#f0f8f2] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#5f6d79]">
                Today&apos;s guidance
              </p>
              <p className="mt-1 text-base font-semibold text-[#182230]">Tempo Run · 8 km aerobic</p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => setShowAuthPanel(true)}
            className="w-full rounded-2xl bg-[#0f1a2c] px-5 py-4 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(15,26,44,0.26)] transition hover:bg-[#0a1322]"
          >
            Get started
          </button>
          <button
            type="button"
            onClick={() => setShowAuthPanel((v) => !v)}
            className="w-full rounded-2xl border border-[#d7dfd9] bg-white px-5 py-4 text-lg font-semibold text-[#111c2e] transition hover:border-[#c7d3cc]"
          >
            See how it works
          </button>
        </div>

        <div className="mt-7 flex justify-center gap-2">
          <span className="h-2 w-5 rounded-full bg-[#0f1a2c]" />
          <span className="h-2 w-2 rounded-full bg-[#dce1db]" />
          <span className="h-2 w-2 rounded-full bg-[#dce1db]" />
        </div>

        <p className="mt-5 text-center text-sm text-[#6e7a86]">Built for Apple Health and Apple Watch.</p>

        {showAuthPanel && (
          <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_32px_rgba(19,48,70,0.08)]">
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
