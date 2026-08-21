import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../../api';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../notificationEvents';
import { useAuth } from '../../state/AuthContext';
import ToastContainer from '../../components/ToastContainer';
import DesktopWorkspaceSidebar from './ui/DesktopWorkspaceSidebar';
import WorkspaceTopBar from './ui/WorkspaceTopBar';
import MobileWorkspaceHeader from './ui/MobileWorkspaceHeader';
import MobileBottomNavigation from './ui/MobileBottomNavigation';

export default function BusinessWorkspaceShell({ children, focused = false }: Readonly<{ children: ReactNode; focused?: boolean }>) {
  const { me } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const loadUnreadCount = useCallback(() => {
    if (!me) {
      setUnreadCount(0);
      return;
    }
    void api.notificationUnreadCount().then((response) => setUnreadCount(Number(response?.data?.count || 0))).catch(() => setUnreadCount(0));
  }, [me]);

  useEffect(() => {
    loadUnreadCount();
    globalThis.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
    return () => globalThis.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
  }, [loadUnreadCount]);

  return <div className={`business-workspace${focused ? ' business-workspace--focused' : ''}`}><a className="business-workspace__skip-link" href="#business-workspace-content">跳至主要內容</a><DesktopWorkspaceSidebar businessName={me?.business?.name} /><div className="business-workspace__frame"><WorkspaceTopBar username={me?.username} unreadCount={unreadCount} /><MobileWorkspaceHeader businessName={me?.business?.name} /><main id="business-workspace-content" className="business-workspace__content">{children}</main></div>{!focused ? <MobileBottomNavigation /> : null}<ToastContainer /></div>;
}
