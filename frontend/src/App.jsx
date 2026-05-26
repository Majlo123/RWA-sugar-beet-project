import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import KYCPage from './pages/KYCPage';
import BuyTokensPage from './pages/BuyTokensPage';
import BankPaymentPage from './pages/payments/BankPaymentPage';
import PayPalPaymentPage from './pages/payments/PayPalPaymentPage';
import PayPalReturnPage from './pages/payments/PayPalReturnPage';
import PayPalCancelPage from './pages/payments/PayPalCancelPage';
import CryptoPaymentPage from './pages/payments/CryptoPaymentPage';
import QRPaymentPage from './pages/payments/QRPaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import AdminLayout from './pages/admin/AdminLayout';
import AnalyticsPage from './pages/admin/AnalyticsPage';
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
            <Route path="buy-tokens" element={<NonAdminRoute><BuyTokensPage /></NonAdminRoute>} />
            <Route path="payments/history" element={<NonAdminRoute><PaymentHistoryPage /></NonAdminRoute>} />
            <Route path="payments/:id/bank" element={<NonAdminRoute><BankPaymentPage /></NonAdminRoute>} />
            <Route path="payments/:id/paypal" element={<NonAdminRoute><PayPalPaymentPage /></NonAdminRoute>} />
            <Route path="payments/:id/crypto" element={<NonAdminRoute><CryptoPaymentPage /></NonAdminRoute>} />
            <Route path="payments/:id/qr" element={<NonAdminRoute><QRPaymentPage /></NonAdminRoute>} />
            <Route path="paypal-return" element={<NonAdminRoute><PayPalReturnPage /></NonAdminRoute>} />
            <Route path="paypal-cancel" element={<NonAdminRoute><PayPalCancelPage /></NonAdminRoute>} />
            <Route path="payment-success" element={<NonAdminRoute><PaymentSuccessPage /></NonAdminRoute>} />
            <Route path="payment-failed" element={<NonAdminRoute><PaymentFailedPage /></NonAdminRoute>} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AnalyticsPage />} />
              <Route path="kyc" element={<KYCReviewsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
