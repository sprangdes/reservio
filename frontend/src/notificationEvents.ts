export const NOTIFICATIONS_CHANGED_EVENT = 'reservio:notifications-changed';

export function emitNotificationsChanged() {
  globalThis.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
