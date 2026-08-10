import { safeInternalReturnTo } from './authDestination';

const KEY = 'reservio.auth.return-context.v1';
const MAX_AGE_MS = 15 * 60 * 1000;

type StoredReturnContext = { version: 1; path: string; createdAt: number };

function parse(value: string | null): StoredReturnContext | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<StoredReturnContext>;
    if (candidate.version !== 1 || typeof candidate.createdAt !== 'number' || Date.now() - candidate.createdAt > MAX_AGE_MS) return null;
    const path = safeInternalReturnTo(candidate.path);
    return path ? { version: 1, path, createdAt: candidate.createdAt } : null;
  } catch {
    return null;
  }
}

export function persistReturnContext(source: unknown): string | null {
  const path = safeInternalReturnTo(source);
  if (!path) {
    sessionStorage.removeItem(KEY);
    return null;
  }
  sessionStorage.setItem(KEY, JSON.stringify({ version: 1, path, createdAt: Date.now() } satisfies StoredReturnContext));
  return path;
}

export function peekReturnContext(): string | null {
  const context = parse(sessionStorage.getItem(KEY));
  if (!context) sessionStorage.removeItem(KEY);
  return context?.path ?? null;
}

export function consumeReturnContext(): string | null {
  const path = peekReturnContext();
  sessionStorage.removeItem(KEY);
  return path;
}

export function clearReturnContext(): void {
  sessionStorage.removeItem(KEY);
}
