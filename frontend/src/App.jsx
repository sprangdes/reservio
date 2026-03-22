import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RegisterBusinessPage from './pages/RegisterBusinessPage.jsx';
import ReservationNewPage from './pages/ReservationNewPage.jsx';
import MyReservationsPage from './pages/MyReservationsPage.jsx';
import ManageTodayPage from './pages/ManageTodayPage.jsx';
import ManageAllPage from './pages/ManageAllPage.jsx';
import ManagePendingPage from './pages/ManagePendingPage.jsx';
import ServiceManagementPage from './pages/ServiceManagementPage.jsx';

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
