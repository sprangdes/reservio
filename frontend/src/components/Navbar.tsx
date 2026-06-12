import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { api } from '../api';
import { useToast } from '../state/ToastContext';
import { emitNotificationsChanged, NOTIFICATIONS_CHANGED_EVENT } from '../notificationEvents';
import { NotificationSettingsPanel } from '../pages/NotificationSettingsPage';
import { PreferredBusinessesPanel } from '../pages/PreferredBusinessesPage';

interface NotificationItem {
  id: number;
  reservationId?: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

type ActiveSettingsPanel = 'notifications' | 'preferred-businesses' | null;

export default function Navbar() {
  const { me, setMe } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<ActiveSettingsPanel>(null);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  useEffect(() => {
    if (!me) {
      setUnreadCount(0);
      setNotificationItems([]);
      return;
    }
    const load = () => {
      void api.notificationUnreadCount()
        .then((res) => setUnreadCount(Number(res?.data?.count || 0)))
        .catch(() => setUnreadCount(0));
      void api.notifications(0, 5)
        .then((res) => setNotificationItems(res?.data?.content || []))
        .catch(() => setNotificationItems([]));
    };
    const loadWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };
    load();
    const timer = globalThis.setInterval(load, 10000);
    globalThis.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    globalThis.addEventListener('focus', load);
    document.addEventListener('visibilitychange', loadWhenVisible);
    return () => {
      globalThis.clearInterval(timer);
      globalThis.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
      globalThis.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', loadWhenVisible);
    };
  }, [me]);

  useEffect(() => {
    const media = globalThis.matchMedia('(max-width: 768px)');
    const update = () => setHoverEnabled(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      setMe(null);
      setSuccessMessage('您已成功登出。');
      navigate('/login');
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '登出失敗');
    }
  };

  const openNotification = async (item: NotificationItem) => {
    try {
      if (!item.read) {
        await api.markNotificationRead(item.id);
        emitNotificationsChanged();
      }
      setNotificationModalOpen(false);
      setOpen(false);
      navigate(me?.role === 'ROLE_BUSINESS' ? '/reservation/manage' : '/my/reservations');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '通知更新失敗');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      emitNotificationsChanged();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '通知更新失敗');
    }
  };

  const closeSettingsPanel = () => setActiveSettingsPanel(null);
  const closeNotificationModal = () => setNotificationModalOpen(false);

  const openSettingsPanel = (panel: Exclude<ActiveSettingsPanel, null>) => {
    setActiveSettingsPanel(panel);
    setOpen(false);
  };

  const openMobileNotifications = () => {
    setNotificationModalOpen(true);
    setOpen(false);
  };

  const settingsPanelTitle = activeSettingsPanel === 'notifications' ? '通知設定' : '管理想預約店家';

  const navClass = 'navbar navbar-expand-lg navbar-dark fixed-top navbar-transparent navbar-custom-shadow';

  return (
    <div>
      <nav
        className={navClass}
        onMouseEnter={() => hoverEnabled && setOpen(true)}
        onMouseLeave={() => hoverEnabled && setOpen(false)}
      >
        <div className="container">
          <Link className="navbar-brand fw-bold fs-3 brand-highlight" to="/">
            Reserv<span className="brand-accent">io</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${open ? 'show' : ''}`} id="navbarNav">
            <ul className="navbar-nav me-auto">
              {me ? (
                <>
                  {me.role === 'ROLE_BUSINESS' ? null : (
                    <li className="nav-item">
                      <Link className="nav-link" to="/reservation/new">
                        立即預約
                      </Link>
                    </li>
                  )}
                  <li className="nav-item">
                    <Link className="nav-link" to="/my/reservations">
                      我的預約
                    </Link>
                  </li>
                  <li className="nav-item mobile-menu__divider"></li>
                  <li className="nav-item mobile-menu__user">
                    <span className="nav-link">
                      <i className="bi bi-person-circle me-1"></i> 你好，<strong>{String(me.username || '')}</strong>！
                    </span>
                  </li>
                  <li className="nav-item mobile-menu__item">
                    <button type="button" className="nav-link mobile-menu__button" onClick={openMobileNotifications}>
                      <span><i className="bi bi-bell me-2"></i>通知</span>
                      {unreadCount > 0 ? <span className="badge rounded-pill bg-danger">{unreadCount}</span> : null}
                    </button>
                  </li>
                  {me.role === 'ROLE_BUSINESS' ? (
                    <li className="nav-item mobile-menu__item">
                      <Link className="nav-link" to="/business/info">
                        商家資訊
                      </Link>
                    </li>
                  ) : (
                    <li className="nav-item mobile-menu__item">
                      <button type="button" className="nav-link mobile-menu__button" onClick={() => openSettingsPanel('preferred-businesses')}>
                        想預約店家
                      </button>
                    </li>
                  )}
                  <li className="nav-item mobile-menu__item">
                    <button type="button" className="nav-link mobile-menu__button" onClick={() => openSettingsPanel('notifications')}>
                      通知設定
                    </button>
                  </li>
                  {me.emailVerified ? null : (
                    <li className="nav-item mobile-menu__item">
                      <button type="button" className="nav-link mobile-menu__button mobile-menu__button--warning" onClick={() => openSettingsPanel('notifications')}>
                        驗證 Email
                      </button>
                    </li>
                  )}
                  <li className="nav-item mobile-menu__item">
                    <button type="button" onClick={handleLogout} className="nav-link mobile-menu__button mobile-menu__button--logout">
                      登出
                    </button>
                  </li>
                </>
              ) : null}
            </ul>

            <div className={`navbar-nav ms-auto ${me ? 'navbar-desktop-actions' : ''}`}>
              {me ? (
                <div className="d-flex align-items-center">
                  <div className="dropdown notification-menu me-3">
                    <button
                      className="btn btn-link nav-link text-white position-relative px-2 notification-menu__toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-label="通知"
                      title="通知"
                    >
                      <i className="bi bi-bell fs-5"></i>
                      {unreadCount > 0 ? (
                        <span className="position-absolute start-100 translate-middle badge rounded-pill bg-danger notification-badge">
                          {unreadCount}
                        </span>
                      ) : null}
                    </button>
                    <div className="dropdown-menu dropdown-menu-end notification-menu__dropdown">
                      <div className="notification-menu__header">
                        <span>通知</span>
                        <button
                          type="button"
                          className="btn btn-link notification-menu__read-all"
                          disabled={unreadCount === 0}
                          onClick={() => void markAllNotificationsRead()}
                        >
                          全部已讀
                        </button>
                      </div>
                      <div className="notification-menu__list">
                        {notificationItems.length === 0 ? (
                          <div className="notification-menu__empty">目前沒有通知</div>
                        ) : notificationItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`notification-menu__item ${item.read ? '' : 'notification-menu__item--unread'}`}
                            onClick={() => void openNotification(item)}
                          >
                            <span className="notification-menu__title">{item.title}</span>
                            <span className="notification-menu__content">{item.content}</span>
                            <span className="notification-menu__time">
                              {new Date(item.createdAt).toLocaleString('zh-TW')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown user-menu">
                    <button
                      className="btn btn-link nav-link dropdown-toggle text-white text-white-strong px-2 user-menu__toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="bi bi-person-circle"></i> 你好，<strong>{String(me.username || '')}</strong>！
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end user-menu__dropdown">
                      {me.role === 'ROLE_BUSINESS' ? (
                        <li>
                          <Link className="dropdown-item user-menu__item" to="/business/info">
                            商家資訊
                          </Link>
                        </li>
                      ) : (
                        <li>
                          <button
                            type="button"
                            className="dropdown-item user-menu__item"
                            onClick={() => openSettingsPanel('preferred-businesses')}
                          >
                            想預約店家
                          </button>
                        </li>
                      )}
                      <li>
                        <button
                          type="button"
                          className="dropdown-item user-menu__item"
                          onClick={() => openSettingsPanel('notifications')}
                        >
                          通知設定
                        </button>
                      </li>
                      {me.emailVerified ? null : (
                          <li>
                            <button
                                type="button"
                                className="dropdown-item user-menu__item user-menu__item--warning"
                                onClick={() => openSettingsPanel('notifications')}
                            >
                              驗證 Email
                            </button>
                          </li>
                      )}
                      <li><hr className="dropdown-divider user-menu__divider" /></li>
                      <li>
                        <button type="button" onClick={handleLogout} className="dropdown-item user-menu__item user-menu__item--logout">
                          登出
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center">
                  <Link to="/login" className="btn btn-outline-light btn-sm me-2 px-3 rounded-pill">
                    登入
                  </Link>
                  <Link to="/register" className="btn btn-light btn-sm text-primary fw-bold px-3 rounded-pill shadow-sm">
                    註冊
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {activeSettingsPanel ? (
        <>
          <div className="modal fade show settings-modal" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content settings-modal__content">
                <div className="modal-header settings-modal__header">
                  <h5 className="modal-title fw-bold">{settingsPanelTitle}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeSettingsPanel}></button>
                </div>
                <div className="modal-body settings-modal__body">
                  {activeSettingsPanel === 'notifications' ? (
                    <NotificationSettingsPanel onSaved={closeSettingsPanel} />
                  ) : (
                    <PreferredBusinessesPanel onCancel={closeSettingsPanel} onSaved={closeSettingsPanel} />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      ) : null}
      {notificationModalOpen ? (
        <>
          <div className="modal fade show settings-modal" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content settings-modal__content">
                <div className="modal-header settings-modal__header">
                  <h5 className="modal-title fw-bold">通知</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeNotificationModal}></button>
                </div>
                <div className="modal-body settings-modal__body p-0">
                  <div className="notification-menu__header">
                    <span>最近通知</span>
                    <button
                      type="button"
                      className="btn btn-link notification-menu__read-all"
                      disabled={unreadCount === 0}
                      onClick={() => void markAllNotificationsRead()}
                    >
                      全部已讀
                    </button>
                  </div>
                  <div className="notification-menu__list">
                    {notificationItems.length === 0 ? (
                      <div className="notification-menu__empty">目前沒有通知</div>
                    ) : notificationItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`notification-menu__item ${item.read ? '' : 'notification-menu__item--unread'}`}
                        onClick={() => void openNotification(item)}
                      >
                        <span className="notification-menu__title">{item.title}</span>
                        <span className="notification-menu__content">{item.content}</span>
                        <span className="notification-menu__time">
                          {new Date(item.createdAt).toLocaleString('zh-TW')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      ) : null}
    </div>
  );
}
