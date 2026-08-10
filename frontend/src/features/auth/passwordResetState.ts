const KEY = 'reservio.auth.password-reset.v1';
const MAX_AGE_MS = 15 * 60 * 1000;

export type PasswordResetState = { identifier: string; requestedAt: number };

export function savePasswordResetState(identifier: string): PasswordResetState | null {
  const normalized = identifier.trim();
  if (!normalized) return null;
  const state = { identifier: normalized, requestedAt: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function loadPasswordResetState(): PasswordResetState | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as Partial<PasswordResetState>;
    if (typeof state.identifier !== 'string' || !state.identifier || typeof state.requestedAt !== 'number' || Date.now() - state.requestedAt > MAX_AGE_MS) {
      clearPasswordResetState();
      return null;
    }
    return { identifier: state.identifier, requestedAt: state.requestedAt };
  } catch {
    clearPasswordResetState();
    return null;
  }
}

export function clearPasswordResetState(): void {
  sessionStorage.removeItem(KEY);
}
