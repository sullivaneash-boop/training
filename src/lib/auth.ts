export type AuthState = {
  loading: boolean;
  authenticated: boolean;
  authRequired: boolean;
};

export async function checkAuth(): Promise<{ authenticated: boolean; authRequired: boolean }> {
  const res = await fetch('/api/auth/check', { credentials: 'include' });
  if (!res.ok) {
    return { authenticated: false, authRequired: true };
  }
  const data = (await res.json()) as { authenticated?: boolean; authRequired?: boolean };
  return {
    authenticated: Boolean(data.authenticated),
    authRequired: Boolean(data.authRequired),
  };
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error ?? 'Login failed' };
  }
  return { ok: true };
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
