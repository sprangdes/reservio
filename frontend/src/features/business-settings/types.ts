export type SettingsFormKey = string;
export type SettingsSaveState = 'idle' | 'dirty' | 'invalid' | 'submitting' | 'success' | 'error' | 'stale';
export type SettingsFieldErrors<T> = Partial<Record<Extract<keyof T, string>, string>>;
export type SettingsValidationResult<T> = { fieldErrors: SettingsFieldErrors<T>; formError?: string };
export type SettingsFormSnapshot<T> = { baseline: T; values: T; saveState: SettingsSaveState; fieldErrors: SettingsFieldErrors<T>; formError?: string; stale: boolean; isSubmitting: boolean };
