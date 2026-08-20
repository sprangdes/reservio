import { getReservationStatusPresentation } from './status';
import type { ReservationAction, ReservationActionCapabilities, ReservationActionCapability, ReservationCenterItem } from './types';

const actions: ReservationAction[] = ['viewDetails', 'confirm', 'cancel', 'inspectCancellationReason', 'approveCancellation', 'rejectCancellation', 'retryMutation'];

function disabled(action: ReservationAction, reason: string) { return { action, availability: 'disabled' as const, reason }; }

export function resolveReservationActionCapabilities(item: ReservationCenterItem, mutationFailed = false): ReservationActionCapabilities {
  const state = getReservationStatusPresentation(item.backendStatus);
  const result = Object.fromEntries(actions.map((action) => [action, disabled(action, '目前狀態不支援此操作')])) as Record<ReservationAction, ReservationActionCapability>;
  result.viewDetails = item.detailsAvailability === 'unavailable' ? disabled('viewDetails', '目前沒有可用的預約資料') : { action: 'viewDetails', availability: 'available' };
  result.inspectCancellationReason = item.cancellationReason.availability === 'available' ? { action: 'inspectCancellationReason', availability: 'available' } : disabled('inspectCancellationReason', '目前沒有取消原因資料');
  if (state.key === 'PENDING') {
    result.confirm = { action: 'confirm', availability: 'available' };
    result.cancel = { action: 'cancel', availability: 'available' };
  }
  if (state.key === 'CANCEL_REQUESTED') {
    result.approveCancellation = { action: 'approveCancellation', availability: 'available' };
    result.rejectCancellation = { action: 'rejectCancellation', availability: 'available' };
  }
  if (mutationFailed) result.retryMutation = { action: 'retryMutation', availability: 'available' };
  return result;
}

export function isReservationActionAvailable(capabilities: ReservationActionCapabilities, action: ReservationAction): boolean { return capabilities[action].availability === 'available'; }
