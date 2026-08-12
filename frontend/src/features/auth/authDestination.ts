export type AuthDestinationUser = {
  role?: string;
  mustChangePassword?: boolean;
  business?: unknown;
};

export type PostAuthReason = 'force-change' | 'return-to' | 'setup' | 'role-default';

export type PostAuthDestination = {
  path: string;
  reason: PostAuthReason;
};

const AUTH_LOOP_PATHS = new Set([
  '/login',
  '/register',
  '/register-business',
  '/forgot-password',
  '/forgot-password/verify',
  '/force-change-password'
]);

const CUSTOMER_PATHS = new Set([
  '/reservation/new',
  '/my/reservations',
  '/preferred-businesses',
  '/notifications',
  '/notifications/settings',
  '/settings/line-accounts',
  '/profile',
  '/line/account-link'
]);

const MERCHANT_EXACT_PATHS = new Set([
  '/',
  '/reservation/manage',
  '/reservation/today/manage',
  '/reservation/pending/manage',
  '/service/manage',
  '/service/new',
  '/business/info',
  '/business/line-integration',
  '/notifications',
  '/notifications/settings',
  '/business/settings',
  '/business/settings/profile',
  '/business/settings/booking',
  '/business/settings/hours',
  '/business/settings/notifications',
  '/business/settings/integrations/line',
  '/business/settings/account'
]);

function hasControlCharacter(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function isKnownMerchantPath(pathname: string): boolean {
  return MERCHANT_EXACT_PATHS.has(pathname)
    || /^\/service\/[^/]+\/edit$/.test(pathname);
}

function isKnownReturnPath(pathname: string): boolean {
  return CUSTOMER_PATHS.has(pathname) || isKnownMerchantPath(pathname);
}

/** Returns a normalized internal route or null. It never returns an external URL. */
export function safeInternalReturnTo(source: unknown): string | null {
  if (typeof source !== 'string' || !source || hasControlCharacter(source) || source.includes('\\')) {
    return null;
  }
  if (!source.startsWith('/') || source.startsWith('//')) {
    return null;
  }

  try {
    const decodedSource = decodeURIComponent(source);
    if (hasControlCharacter(decodedSource) || decodedSource.includes('\\') || decodedSource.startsWith('//')) {
      return null;
    }
    const parsed = new URL(source, 'https://reservio.internal');
    if (parsed.origin !== 'https://reservio.internal' || AUTH_LOOP_PATHS.has(parsed.pathname) || !isKnownReturnPath(parsed.pathname)) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function isRoleCompatibleDestination(user: AuthDestinationUser | null | undefined, path: string): boolean {
  const safePath = safeInternalReturnTo(path);
  if (!user || !safePath || user.mustChangePassword) {
    return false;
  }
  const pathname = new URL(safePath, 'https://reservio.internal').pathname;
  if (user.role === 'ROLE_USER') {
    return CUSTOMER_PATHS.has(pathname);
  }
  if (user.role === 'ROLE_BUSINESS') {
    return Boolean(user.business) && isKnownMerchantPath(pathname);
  }
  return false;
}

export function roleDefaultDestination(user: AuthDestinationUser): PostAuthDestination {
  if (user.role === 'ROLE_BUSINESS') {
    return user.business
      ? { path: '/', reason: 'role-default' }
      : { path: '/business/setup', reason: 'setup' };
  }
  return { path: '/reservation/new', reason: 'role-default' };
}

export function resolvePostAuthDestination(
  user: AuthDestinationUser,
  returnTo?: unknown
): PostAuthDestination {
  if (user.mustChangePassword) {
    return { path: '/force-change-password', reason: 'force-change' };
  }

  const safePath = safeInternalReturnTo(returnTo);
  if (safePath && isRoleCompatibleDestination(user, safePath)) {
    return { path: safePath, reason: 'return-to' };
  }

  return roleDefaultDestination(user);
}

export function buildLoginPath(pathname: string, search = ''): string {
  const returnTo = safeInternalReturnTo(`${pathname}${search}`);
  return returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
}
