export type ServiceViewModel = { id: string; name: string; duration: number; active: boolean };
export type ServiceFormValue = { name: string; duration: string };
export type ServiceListResult = { services: ServiceViewModel[]; malformed: number };

export function normalizeService(value: unknown): ServiceViewModel | undefined {
  const item = value as Record<string, unknown> | null;
  const id = item?.id; const name = item?.name; const duration = item?.duration; const active = item?.active;
  if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '' || typeof name !== 'string' || !name.trim() || !Number.isInteger(Number(duration)) || Number(duration) <= 0 || (typeof active !== 'boolean' && active !== null)) return undefined;
  return { id: String(id), name, duration: Number(duration), active: active === true };
}
export function normalizeServices(value: unknown): ServiceListResult { const items = Array.isArray(value) ? value : []; const services = items.map(normalizeService).filter((item): item is ServiceViewModel => Boolean(item)); return { services, malformed: items.length - services.length }; }
export function serviceSummary(services: ServiceViewModel[]) { const active = services.filter((service) => service.active).length; return { total: services.length, active, inactive: services.length - active }; }
export function validateServiceForm(value: ServiceFormValue): Record<string, string> { const errors: Record<string, string> = {}; if (!value.name.trim()) errors.name = '請輸入服務名稱'; const duration = Number(value.duration); if (!value.duration) errors.duration = '請輸入服務時長'; else if (!Number.isInteger(duration) || duration <= 0) errors.duration = '服務時長必須是正整數分鐘'; return errors; }
export function servicePayload(value: ServiceFormValue) { return { name: value.name.trim(), duration: Number(value.duration) }; }
export function serviceErrorMessage(error: unknown, action: 'create' | 'modify' | 'delete' | 'toggle' | 'load' = 'load') { const message = error instanceof Error ? error.message : ''; if (/服務項目不存在|not found/i.test(message)) return '找不到這項服務，服務可能已被刪除。'; if (action === 'modify' && /目前無法編輯|無法修改/i.test(message)) return '此服務已有待處理或已確認的預約，目前無法修改。'; if (action === 'delete' && /無法刪除|目前無法編輯/i.test(message)) return '此服務已有待處理或已確認的預約，因此無法刪除。你可以先停用服務，避免新的預約。'; if (/duplicate|已存在|重複/i.test(message)) return '服務名稱已存在，請使用其他名稱。'; if (/unauthorized|forbidden|權限/i.test(message)) return '目前帳號沒有管理服務的權限。'; if (/network|failed to fetch/i.test(message)) return '網路連線失敗，請確認連線後重試。'; return ({ create: '新增服務失敗，請稍後再試。', modify: '更新服務失敗，請稍後再試。', delete: '刪除服務失敗，請稍後再試。', toggle: '更新服務狀態失敗，請稍後再試。', load: '取得服務清單失敗，請稍後再試。' }[action]); }
