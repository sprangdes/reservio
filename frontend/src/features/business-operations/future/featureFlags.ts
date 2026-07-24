export type CapabilityState = 'unavailable' | 'preview' | 'enabled';

export type OperationsCapability =
  | 'reports'
  | 'messageCenter'
  | 'resourceScheduling'
  | 'bulkActions'
  | 'export';

const isDevelopmentPreview = import.meta.env.DEV && import.meta.env.VITE_BUSINESS_OPERATIONS_PREVIEW === 'true';

const previewState: CapabilityState = isDevelopmentPreview ? 'preview' : 'unavailable';

export const businessOperationsCapabilities: Readonly<Record<OperationsCapability, CapabilityState>> = {
  reports: previewState,
  messageCenter: previewState,
  resourceScheduling: 'unavailable',
  bulkActions: 'unavailable',
  export: 'unavailable'
};

export function isPreviewCapability(capability: OperationsCapability): boolean {
  return businessOperationsCapabilities[capability] === 'preview';
}
