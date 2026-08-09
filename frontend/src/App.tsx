import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterBusinessPage from './pages/RegisterBusinessPage';
import ReservationNewPage from './pages/ReservationNewPage';
import MyReservationsPage from './pages/MyReservationsPage';
import ManageTodayPage from './pages/ManageTodayPage';
import ManageAllPage from './pages/ManageAllPage';
import ManagePendingPage from './pages/ManagePendingPage';
import ServiceManagementPage from './pages/ServiceManagementPage';
import BusinessInfoPage from './features/business-settings/LegacyBusinessInfoCompatibility';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ForgotPasswordVerifyPage from './pages/ForgotPasswordVerifyPage';
import ForceChangePasswordPage from './pages/ForceChangePasswordPage';
import PreferredBusinessesPage from './pages/PreferredBusinessesPage';
import BusinessSetupPage from './pages/BusinessSetupPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import LineAccountLinkPage from './pages/LineAccountLinkPage';
import LineAccountLinksPage from './pages/LineAccountLinksPage';
import ProfilePage from './pages/ProfilePage';
import BusinessWorkspaceShell from './features/business-operations/BusinessWorkspaceShell';
import OperationsOverviewPage from './features/business-operations/OperationsOverviewPage';
import ReservationCenterPage, { type ReservationCenterPreset } from './features/business-operations/ReservationCenterPage';
import { useAuth } from './state/AuthContext';
import {JSX} from "react";
import SessionTimeoutManager from './components/SessionTimeoutManager';
import { ServiceEditorScaffold, SettingsLandingPage, SettingsScaffoldPage } from './features/business-settings/SettingsPages';
import { resolveNotificationSettingsRoute } from './features/customer-notifications/customerNotificationSettingsRoute';

function RequireAuth({ children }: Readonly<{ children: JSX.Element }>) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!me) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return children;
}

function PasswordResetGuard({ children }: Readonly<{ children: JSX.Element }>) {
  const { me, loading } = useAuth();
  const location = useLocation();
  const allowPaths = ['/force-change-password', '/login', '/forgot-password', '/forgot-password/verify'];

  if (loading) {
    return children;
  }

  if (me?.mustChangePassword && !allowPaths.includes(location.pathname)) {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
}

function BusinessSetupGuard({ children }: Readonly<{ children: JSX.Element }>) {
  const { me, loading } = useAuth();
  const location = useLocation();
  const allowPaths = ['/business/setup', '/force-change-password'];

  if (!loading && me?.role === 'ROLE_BUSINESS' && !me.business && !allowPaths.includes(location.pathname)) {
    return <Navigate to="/business/setup" replace />;
  }

  return children;
}

function BusinessAwareHome() {
  const { me } = useAuth();
  if (me?.role === 'ROLE_BUSINESS') {
    return <BusinessWorkspaceShell><OperationsOverviewPage /></BusinessWorkspaceShell>;
  }
  return <Layout><HomePage /></Layout>;
}

function ReservationCenterRoute({ preset, legacyContent }: Readonly<{ preset: ReservationCenterPreset; legacyContent: JSX.Element }>) {
  return <BusinessWorkspaceShell><ReservationCenterPage preset={preset} legacyContent={legacyContent} /></BusinessWorkspaceShell>;
}

function RequireBusiness({ children }: Readonly<{ children: JSX.Element }>) {
  const { me, loading } = useAuth();
  if (loading) return null;
  if (me?.role !== 'ROLE_BUSINESS' || !me.business) return <Navigate to="/" replace />;
  return children;
}

function SettingsRoute({ page }: Readonly<{ page: 'landing' | 'profile' | 'booking' | 'hours' | 'notifications' | 'line' | 'account' }>) {
  const focused = page !== 'landing';
  return <RequireBusiness><BusinessWorkspaceShell focused={focused}>{page === 'landing' ? <SettingsLandingPage /> : <SettingsScaffoldPage page={page} />}</BusinessWorkspaceShell></RequireBusiness>;
}

function RoleAwareNotificationSettingsRoute() {
  const { me } = useAuth();
  if (resolveNotificationSettingsRoute(me?.role, Boolean(me?.business)) === 'merchant-compatibility') {
    return <BusinessWorkspaceShell focused><SettingsScaffoldPage page="notifications" /></BusinessWorkspaceShell>;
  }
  return <Layout><NotificationSettingsPage /></Layout>;
}

function NotificationSettingsCompatibility() {
  return <RoleAwareNotificationSettingsRoute />;
}

function LineIntegrationCompatibility() {
  return <RequireBusiness><Navigate to="/business/settings/integrations/line" replace /></RequireBusiness>;
}

export default function App() {
  return (
    <PasswordResetGuard>
      <BusinessSetupGuard>
        <>
        <SessionTimeoutManager />
        <Routes>
      <Route
        path="/"
        element={<BusinessAwareHome />}
      />
      <Route
        path="/login"
        element={
          <Layout>
            <LoginPage />
          </Layout>
        }
      />
      <Route
        path="/register"
        element={
          <Layout>
            <RegisterPage />
          </Layout>
        }
      />
      <Route
        path="/register-business"
        element={
          <Layout>
            <RegisterBusinessPage />
          </Layout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Layout>
            <ForgotPasswordPage />
          </Layout>
        }
      />
      <Route
        path="/forgot-password/verify"
        element={
          <Layout>
            <ForgotPasswordVerifyPage />
          </Layout>
        }
      />
      <Route
        path="/force-change-password"
        element={
          <Layout>
            <RequireAuth>
              <ForceChangePasswordPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/reservation/new"
        element={
          <Layout>
            <RequireAuth>
              <ReservationNewPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/my/reservations"
        element={
          <Layout>
            <RequireAuth>
              <MyReservationsPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/preferred-businesses"
        element={
          <Layout>
            <RequireAuth>
              <PreferredBusinessesPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/reservation/today/manage"
        element={
          <RequireAuth><ReservationCenterRoute preset="today" legacyContent={<ManageTodayPage />} /></RequireAuth>
        }
      />
      <Route
        path="/reservation/manage"
        element={
          <RequireAuth><ReservationCenterRoute preset="all" legacyContent={<ManageAllPage />} /></RequireAuth>
        }
      />
      <Route
        path="/reservation/pending/manage"
        element={
          <RequireAuth><ReservationCenterRoute preset="pending" legacyContent={<ManagePendingPage />} /></RequireAuth>
        }
      />
      <Route
        path="/service/manage"
        element={
          <RequireAuth><RequireBusiness><BusinessWorkspaceShell><ServiceManagementPage /></BusinessWorkspaceShell></RequireBusiness></RequireAuth>
        }
      />
      <Route path="/service/new" element={<RequireAuth><RequireBusiness><BusinessWorkspaceShell focused><ServiceEditorScaffold editing={false} /></BusinessWorkspaceShell></RequireBusiness></RequireAuth>} />
      <Route path="/service/:id/edit" element={<RequireAuth><RequireBusiness><BusinessWorkspaceShell focused><ServiceEditorScaffold editing /></BusinessWorkspaceShell></RequireBusiness></RequireAuth>} />
      <Route
        path="/notifications"
        element={<Layout><RequireAuth><NotificationsPage /></RequireAuth></Layout>}
      />
      <Route
        path="/notifications/settings"
        element={<RequireAuth><NotificationSettingsCompatibility /></RequireAuth>}
      />
      <Route
        path="/business/setup"
        element={
          <Layout>
            <RequireAuth>
              <BusinessSetupPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/business/info"
        element={
          <RequireAuth><RequireBusiness><BusinessWorkspaceShell><BusinessInfoPage /></BusinessWorkspaceShell></RequireBusiness></RequireAuth>
        }
      />
      <Route path="/business/settings" element={<RequireAuth><SettingsRoute page="landing" /></RequireAuth>} />
      <Route path="/business/settings/profile" element={<RequireAuth><SettingsRoute page="profile" /></RequireAuth>} />
      <Route path="/business/settings/booking" element={<RequireAuth><SettingsRoute page="booking" /></RequireAuth>} />
      <Route path="/business/settings/hours" element={<RequireAuth><SettingsRoute page="hours" /></RequireAuth>} />
      <Route path="/business/settings/notifications" element={<RequireAuth><SettingsRoute page="notifications" /></RequireAuth>} />
      <Route path="/business/settings/integrations/line" element={<RequireAuth><SettingsRoute page="line" /></RequireAuth>} />
      <Route path="/business/settings/account" element={<RequireAuth><SettingsRoute page="account" /></RequireAuth>} />
      <Route
        path="/line/account-link"
        element={<Layout><LineAccountLinkPage /></Layout>}
      />
      <Route
        path="/settings/line-accounts"
        element={
          <Layout>
            <RequireAuth>
              <LineAccountLinksPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/profile"
        element={
          <Layout>
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/business/line-integration"
        element={
          <RequireAuth><LineIntegrationCompatibility /></RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </>
      </BusinessSetupGuard>
    </PasswordResetGuard>
  );
}
