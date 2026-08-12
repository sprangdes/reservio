export type ForgotPasswordRequest = { emailOrUsername: string };
export type VerifyPasswordOtpRequest = { emailOrUsername: string; otp: string };
export type ForceChangePasswordRequest = { newPassword: string };

export function normalizeRecoveryIdentifier(value: string): string {
  return value.trim();
}

export function forgotPasswordRequest(identifier: string): ForgotPasswordRequest {
  return { emailOrUsername: normalizeRecoveryIdentifier(identifier) };
}

export function verifyPasswordOtpRequest(identifier: string, otp: string): VerifyPasswordOtpRequest {
  return { emailOrUsername: normalizeRecoveryIdentifier(identifier), otp };
}

export function forceChangePasswordRequest(newPassword: string): ForceChangePasswordRequest {
  return { newPassword };
}
