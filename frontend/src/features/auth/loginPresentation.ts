import { safeInternalReturnTo } from './authDestination';

export type LoginReturnPresentation = {
  path: string;
  title: string;
  description: string;
};

const presentationByPath: Record<string, Omit<LoginReturnPresentation, 'path'>> = {
  '/reservation/new': {
    title: '登入後將繼續預約',
    description: '完成登入後，會回到你剛才的預約流程。'
  },
  '/my/reservations': {
    title: '登入後將回到我的預約',
    description: '完成登入後，會回到你的預約狀態。'
  }
};

export function loginReturnPresentation(source: unknown): LoginReturnPresentation | null {
  const path = safeInternalReturnTo(source);
  if (!path) return null;
  const pathname = new URL(path, 'https://reservio.internal').pathname;
  const presentation = presentationByPath[pathname];
  return presentation ? { path, ...presentation } : null;
}

export function customerLineReturnContext(source: unknown): string | null {
  return loginReturnPresentation(source)?.path ?? null;
}
