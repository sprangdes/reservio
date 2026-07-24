import { businessOperationsCapabilities, type CapabilityState } from '../future/featureFlags';
import type { ReservationCapability } from './types';

const state = (key: keyof typeof businessOperationsCapabilities): CapabilityState => businessOperationsCapabilities[key];

export const reservationCapabilities: readonly ReservationCapability[] = [
  { key: 'resourceScheduling', state: state('resourceScheduling') },
  { key: 'advancedSearch', state: state('advancedSearch') },
  { key: 'bulkActions', state: state('bulkActions') },
  { key: 'export', state: state('export') },
  { key: 'reports', state: state('reports') },
  { key: 'messageCenter', state: state('messageCenter') },
  { key: 'lineIntegrationHealth', state: 'enabled' }
];

export function getReservationCapability(key: ReservationCapability['key']): ReservationCapability { return reservationCapabilities.find((capability) => capability.key === key) || { key, state: 'unavailable' }; }
