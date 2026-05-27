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
import { useAuth } from './state/AuthContext';
import {JSX} from "react";

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

export default function App() {
  return (
    <PasswordResetGuard>
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
            <ForceChangePasswordPage />
          </Layout>
        }
      />
      <Route
        path="/reservation/new"
        element={
          <Layout>
            <ReservationNewPage />
          </Layout>
        }
      />
      <Route
        path="/my/reservations"
        element={
          <Layout>
            <MyReservationsPage />
          </Layout>
        }
      />
      <Route
        path="/preferred-businesses"
        element={
          <Layout>
            <PreferredBusinessesPage />
          </Layout>
        }
      />
      <Route
        path="/reservation/today/manage"
        element={
          <Layout>
            <ManageTodayPage />
          </Layout>
        }
      />
      <Route
        path="/reservation/manage"
        element={
          <Layout>
            <ManageAllPage />
          </Layout>
        }
      />
      <Route
        path="/reservation/pending/manage"
        element={
          <Layout>
            <ManagePendingPage />
          </Layout>
        }
      />
      <Route
        path="/service/manage"
        element={
          <Layout>
            <ServiceManagementPage />
          </Layout>
        }
      />
      <Route
        path="/business/info"
        element={
          <Layout>
            <BusinessInfoPage />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PasswordResetGuard>
  );
}
