export async function checkAuth(): Promise<{ authenticated: boolean; authRequired: boolean }> {
  try {
    const sessionRes = await fetch('/api/auth/get-session', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (sessionRes.ok) {
      const sessionData = (await sessionRes.json().catch(() => ({}))) as {
        session?: unknown;
        user?: unknown;
      };
      const authenticated = Boolean(sessionData.session && sessionData.user);
      return { authenticated, authRequired: true };
    }

    const fallbackRes = await fetch('/api/auth/check', {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = (await fallbackRes.json()) as {
      authenticated?: boolean;
      authRequired?: boolean;
    };
    if (!fallbackRes.ok) {
      return { authenticated: false, authRequired: true };
    }
    return {
      authenticated: Boolean(data.authenticated),
      authRequired: Boolean(data.authRequired),
    };
  } catch {
    return { authenticated: false, authRequired: true };
  }
}

export async function legacyLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Login failed (${res.status})` };
    }
    const check = await checkAuth();
    if (!check.authenticated) {
      return {
        ok: false,
        error: 'Login succeeded but session cookie was not saved. Try Safari (not private) or disable content blockers.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach login server' };
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => {
    // Ignore if Better Auth endpoint isn't configured in this environment.
  });
}
