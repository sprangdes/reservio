export const SESSION_ACTIVITY_EVENT = 'reservio:session-activity';
export const SESSION_EXPIRED_EVENT = 'reservio:session-expired';

export class UnauthorizedError extends Error {
  constructor(message = '登入已逾時，請重新登入。') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export function emitSessionActivity() {
  globalThis.dispatchEvent(new Event(SESSION_ACTIVITY_EVENT));
}

export function emitSessionExpired() {
  globalThis.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}
