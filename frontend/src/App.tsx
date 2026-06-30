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
import BusinessInfoPage from './pages/BusinessInfoPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ForgotPasswordVerifyPage from './pages/ForgotPasswordVerifyPage';
import ForceChangePasswordPage from './pages/ForceChangePasswordPage';
import PreferredBusinessesPage from './pages/PreferredBusinessesPage';
import BusinessSetupPage from './pages/BusinessSetupPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import LineIntegrationPage from './pages/LineIntegrationPage';
import LineAccountLinkPage from './pages/LineAccountLinkPage';
import LineAccountLinksPage from './pages/LineAccountLinksPage';
import ProfilePage from './pages/ProfilePage';
import { useAuth } from './state/AuthContext';
import {JSX} from "react";
import SessionTimeoutManager from './components/SessionTimeoutManager';

function RequireAuth({ children }: Readonly<{ children: JSX.Element }>) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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

export default function App() {
  return (
    <PasswordResetGuard>
      <BusinessSetupGuard>
        <>
        <SessionTimeoutManager />
        <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
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
          <Layout>
            <RequireAuth>
              <ManageTodayPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/reservation/manage"
        element={
          <Layout>
            <RequireAuth>
              <ManageAllPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/reservation/pending/manage"
        element={
          <Layout>
            <RequireAuth>
              <ManagePendingPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/service/manage"
        element={
          <Layout>
            <RequireAuth>
              <ServiceManagementPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route
        path="/notifications"
        element={<Layout><RequireAuth><NotificationsPage /></RequireAuth></Layout>}
      />
      <Route
        path="/notifications/settings"
        element={<Layout><RequireAuth><NotificationSettingsPage /></RequireAuth></Layout>}
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
          <Layout>
            <RequireAuth>
              <BusinessInfoPage />
            </RequireAuth>
          </Layout>
        }
      />
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
          <Layout>
            <RequireAuth>
              <LineIntegrationPage />
            </RequireAuth>
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </>
      </BusinessSetupGuard>
    </PasswordResetGuard>
  );
}
