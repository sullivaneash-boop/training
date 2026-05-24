import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkAuth } from '../lib/auth';
import { loadOnboarding } from '../lib/storage';

export function AuthGate() {
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'login'>('loading');

  useEffect(() => {
    let cancelled = false;
    checkAuth().then(({ authenticated, authRequired }) => {
      if (cancelled) return;
      if (!authRequired || authenticated) setState('ok');
      else setState('login');
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted">
        Checking access…
      </div>
    );
  }

  if (state === 'login') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const onboarding = loadOnboarding();
  if (!onboarding.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (onboarding.onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
