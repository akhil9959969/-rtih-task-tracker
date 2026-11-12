import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/toast';
import DashboardPage from './pages/DashboardPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';

/** Restore the saved theme choice before first paint of routed content. */
function useTheme() {
  useEffect(() => {
    const saved = localStorage.getItem('task-tracker-theme') || 'ivory';
    document.documentElement.dataset.theme = saved;
  }, []);
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-sub">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useTheme();
  return (
    <BrowserRouter basename="/task-tracker">
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
