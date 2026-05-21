import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import KYCPage from './pages/KYCPage';
import AdminLayout from './pages/admin/AdminLayout';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import RecordInvestmentPage from './pages/admin/RecordInvestmentPage';
import KYCReviewsPage from './pages/admin/KYCReviewsPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { useAuth } from './context/AuthContext';

function NonAdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<NonAdminRoute><ProfilePage /></NonAdminRoute>} />
            <Route path="kyc" element={<NonAdminRoute><KYCPage /></NonAdminRoute>} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AnalyticsPage />} />
              <Route path="kyc" element={<KYCReviewsPage />} />
              <Route path="record-investment" element={<RecordInvestmentPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
