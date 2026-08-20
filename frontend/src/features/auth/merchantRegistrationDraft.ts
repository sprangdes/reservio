const KEY = 'businessRegisterDraft';

export type MerchantRegistrationDraft = {
  version: 1;
  username: string;
  email: string;
  businessName: string;
  category: string;
  phone: string;
  address: string;
};

type DraftInput = Omit<MerchantRegistrationDraft, 'version'>;

const empty = (): DraftInput => ({ username: '', email: '', businessName: '', category: '', phone: '', address: '' });

export function saveMerchantRegistrationDraft(input: Partial<DraftInput>): void {
  const values = empty();
  for (const key of Object.keys(values) as Array<keyof DraftInput>) {
    values[key] = typeof input[key] === 'string' ? input[key] : '';
  }
  sessionStorage.setItem(KEY, JSON.stringify({ version: 1, ...values } satisfies MerchantRegistrationDraft));
}

export function loadMerchantRegistrationDraft(): DraftInput | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      clearMerchantRegistrationDraft();
      return null;
    }
    const candidate = parsed as Partial<MerchantRegistrationDraft>;
    const version = (parsed as { version?: unknown }).version;
    if (version !== undefined && version !== 1) {
      clearMerchantRegistrationDraft();
      return null;
    }
    const values = empty();
    for (const key of Object.keys(values) as Array<keyof DraftInput>) {
      if (candidate[key] !== undefined && typeof candidate[key] !== 'string') {
        clearMerchantRegistrationDraft();
        return null;
      }
      values[key] = typeof candidate[key] === 'string' ? candidate[key] : '';
    }
    // Rewriting removes passwords and other legacy properties from older drafts.
    saveMerchantRegistrationDraft(values);
    return values;
  } catch {
    clearMerchantRegistrationDraft();
    return null;
  }
}

export function clearMerchantRegistrationDraft(): void {
  sessionStorage.removeItem(KEY);
}
