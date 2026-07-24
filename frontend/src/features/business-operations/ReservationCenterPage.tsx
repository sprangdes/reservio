import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getReservationRouteForPreset } from './reservations/routePresets';

export type ReservationCenterPreset = 'all' | 'today' | 'pending';

const presetMeta: Record<ReservationCenterPreset, { label: string; description: string; href: string }> = {
  today: { label: '今天', description: '查看今天需要處理的預約。', href: getReservationRouteForPreset('today') },
  pending: { label: '待處理', description: '查看等待確認或取消申請中的預約。', href: getReservationRouteForPreset('pending') },
  all: { label: '全部', description: '集中查看並追蹤所有預約。', href: getReservationRouteForPreset('all') }
};

export default function ReservationCenterPage({ preset, legacyContent }: Readonly<{ preset: ReservationCenterPreset; legacyContent: ReactNode }>) {
  const { search } = useLocation();
  const legacyMode = new URLSearchParams(search).get('legacy') === '1';
  const meta = presetMeta[preset];
  if (legacyMode) return <section className="reservation-center"><header className="reservation-center__header"><p>預約中心</p><h1>現有預約管理</h1><Link to={meta.href} className="reservation-center__back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> 返回新版工作區入口</Link></header><div className="reservation-center__legacy">{legacyContent}</div></section>;
  return <section className="reservation-center" aria-labelledby="reservation-center-title"><header className="reservation-center__header"><p>營運管理</p><h1 id="reservation-center-title">預約中心</h1><span>{meta.description}</span></header><nav className="reservation-center__presets" aria-label="預約範圍">{(Object.keys(presetMeta) as ReservationCenterPreset[]).map((key) => <Link key={key} to={presetMeta[key].href} className={key === preset ? 'is-active' : ''} aria-current={key === preset ? 'page' : undefined}>{presetMeta[key].label}</Link>)}<span className="reservation-center__calendar-boundary"><i className="bi bi-calendar3" aria-hidden="true" /> 行事曆整合中</span></nav><section className="reservation-center__state" aria-labelledby="reservation-center-state-title"><div className="reservation-center__state-symbol"><i className="bi bi-arrow-repeat" aria-hidden="true" /></div><div><h2 id="reservation-center-state-title">預約中心介面正在逐步整合</h2><p>現有功能仍可使用。</p></div><Link to={`${meta.href}?legacy=1`} className="reservation-center__legacy-link">開啟現有預約管理 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></section></section>;
}
