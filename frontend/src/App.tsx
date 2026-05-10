import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
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
  );
}
