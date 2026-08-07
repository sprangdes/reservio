import { Link } from 'react-router-dom';
import {
  CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET,
  customerNotificationSettingsRoute
} from './customerNotificationSettingsRoute';

export default function CustomerNotificationSettingsScaffold() {
  return (
    <main className="customer-notification-settings" aria-labelledby="customer-notification-settings-title">
      <div className="customer-notification-settings__content">
        <Link
          className="customer-notification-settings__back"
          to={CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET}
          aria-label="返回個人資料"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>個人資料</span>
        </Link>

        <header className="customer-notification-settings__header">
          <h1 id="customer-notification-settings-title">{customerNotificationSettingsRoute.title}</h1>
          <p>管理目前帳號接收預約相關 Email 通知的方式。</p>
        </header>

        <section className="customer-notification-settings__scope" aria-label="帳號設定範圍說明">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <p>這些設定套用至目前帳號，不會依商家而變。</p>
        </section>

        <section className="customer-notification-settings__scaffold" aria-labelledby="customer-notification-settings-scaffold-title" aria-busy="true">
          <header>
            <h2 id="customer-notification-settings-scaffold-title">通知設定內容準備中</h2>
            <p>通知設定介面將在下一階段接入。</p>
          </header>
          <div className="customer-notification-settings__skeleton" aria-hidden="true">
            <div className="customer-notification-settings__skeleton-card">
              <span className="customer-notification-settings__skeleton-label" />
              <span className="customer-notification-settings__skeleton-value" />
            </div>
            <div className="customer-notification-settings__skeleton-card customer-notification-settings__skeleton-card--rows">
              <span className="customer-notification-settings__skeleton-row" />
              <span className="customer-notification-settings__skeleton-row" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
