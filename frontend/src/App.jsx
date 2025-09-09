import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Uvozimo čuvara

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Javne rute */}
          <Route index element={<HomePage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          
          {/* Zaštićene rute */}
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
            {/* Ovde bi išle i sve druge stranice samo za prijavljene korisnike */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;