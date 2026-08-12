export type RegistrationIdentity = {
  username: string;
  email: string;
};

export type CustomerRegistrationForm = RegistrationIdentity & {
  password: string;
  confirmPassword: string;
};

export type MerchantRegistrationForm = RegistrationIdentity & {
  password: string;
  businessName: string;
  category: string;
  phone: string;
  address: string;
};

export type RegistrationErrors<T extends string> = Partial<Record<T, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registrationIdentity(source: unknown): RegistrationIdentity | null {
  if (!source || typeof source !== 'object') return null;
  const candidate = source as { registrationIdentity?: unknown };
  if (!candidate.registrationIdentity || typeof candidate.registrationIdentity !== 'object') return null;
  const identity = candidate.registrationIdentity as Partial<RegistrationIdentity>;
  if (typeof identity.username !== 'string' || typeof identity.email !== 'string') return null;
  return { username: identity.username, email: identity.email };
}

export function validateCustomerRegistration(form: CustomerRegistrationForm): RegistrationErrors<keyof CustomerRegistrationForm> {
  const errors: RegistrationErrors<keyof CustomerRegistrationForm> = {};
  if (!form.username.trim()) errors.username = '請輸入使用者名稱。';
  if (!form.email.trim()) errors.email = '請輸入電子郵件。';
  else if (!emailPattern.test(form.email.trim())) errors.email = '請輸入有效的電子郵件。';
  if (!form.password) errors.password = '請輸入密碼。';
  if (!form.confirmPassword) errors.confirmPassword = '請再次輸入密碼。';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = '兩次輸入的密碼不一致。';
  return errors;
}

export function customerRegistrationPayload(form: CustomerRegistrationForm) {
  return { username: form.username.trim(), email: form.email.trim(), password: form.password };
}

export function validateMerchantRegistration(form: MerchantRegistrationForm, categories: readonly string[]): RegistrationErrors<keyof MerchantRegistrationForm> {
  const errors: RegistrationErrors<keyof MerchantRegistrationForm> = {};
  if (!form.username.trim()) errors.username = '請輸入使用者名稱。';
  if (!form.email.trim()) errors.email = '請輸入電子郵件。';
  else if (!emailPattern.test(form.email.trim())) errors.email = '請輸入有效的電子郵件。';
  if (!form.password) errors.password = '請輸入密碼。';
  if (!form.businessName.trim()) errors.businessName = '請輸入商家名稱。';
  if (!form.category || !categories.includes(form.category)) errors.category = '請選擇有效的商家類別。';
  if (!form.phone.trim()) errors.phone = '請輸入電話。';
  if (!form.address.trim()) errors.address = '請輸入地址。';
  return errors;
}

export function merchantRegistrationPayload(form: MerchantRegistrationForm) {
  return {
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    businessName: form.businessName.trim(),
    category: form.category,
    phone: form.phone.trim(),
    address: form.address.trim()
  };
}

export function normalizeBusinessCategories(source: unknown): string[] {
  if (!Array.isArray(source)) return [];
  return [...new Set(source.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}
