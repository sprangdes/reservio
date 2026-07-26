import type { ReactNode } from 'react';
import { useAuth } from '../../state/AuthContext';
import ToastContainer from '../../components/ToastContainer';
import DesktopWorkspaceSidebar from './ui/DesktopWorkspaceSidebar';
import WorkspaceTopBar from './ui/WorkspaceTopBar';
import MobileWorkspaceHeader from './ui/MobileWorkspaceHeader';
import MobileBottomNavigation from './ui/MobileBottomNavigation';

export default function BusinessWorkspaceShell({ children, focused = false }: Readonly<{ children: ReactNode; focused?: boolean }>) {
  const { me } = useAuth();
  return <div className={`business-workspace${focused ? ' business-workspace--focused' : ''}`}><a className="business-workspace__skip-link" href="#business-workspace-content">跳至主要內容</a><DesktopWorkspaceSidebar businessName={me?.business?.name} /><div className="business-workspace__frame"><WorkspaceTopBar username={me?.username} /><MobileWorkspaceHeader businessName={me?.business?.name} /><main id="business-workspace-content" className="business-workspace__content">{children}</main></div>{!focused ? <MobileBottomNavigation /> : null}<ToastContainer /></div>;
}
