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
    if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) return null;
    const candidate = parsed as Partial<MerchantRegistrationDraft>;
    const values = empty();
    for (const key of Object.keys(values) as Array<keyof DraftInput>) {
      if (typeof candidate[key] !== 'string') return null;
      values[key] = candidate[key] as string;
    }
    return values;
  } catch {
    return null;
  }
}

export function clearMerchantRegistrationDraft(): void {
  sessionStorage.removeItem(KEY);
}
