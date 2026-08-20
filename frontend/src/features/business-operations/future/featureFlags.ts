export type CapabilityState = 'unavailable' | 'enabled';

export type OperationsCapability =
  | 'reports'
  | 'messageCenter'
  | 'resourceScheduling'
  | 'advancedSearch'
  | 'bulkActions'
  | 'export';

export const businessOperationsCapabilities: Readonly<Record<OperationsCapability, CapabilityState>> = {
  reports: 'unavailable',
  messageCenter: 'unavailable',
  resourceScheduling: 'unavailable',
  advancedSearch: 'unavailable',
  bulkActions: 'unavailable',
  export: 'unavailable'
};
