import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import authService from "./services/authService";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import { ThemeProvider } from "./context/ThemeContext";

const PublicFormPage = lazy(() => import("./pages/PublicFormPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));

const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    <p>Loading...</p>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored authentication on mount
  useEffect(() => {
    try {
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
      }
    } catch (e) {
      console.error("Auth init error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
        {/* Public Form Route - Accessible by anyone */}
        <Route path="/form/:id" element={
          <Suspense fallback={<LoadingFallback />}>
            <PublicFormPage />
          </Suspense>
        } />
        {/* Password reset routes */}
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/notifications"
          element={
            user ? (
              <Suspense fallback={<LoadingFallback />}>
                <NotificationsPage />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/builder"
          element={
            user ? (
              <Suspense fallback={<LoadingFallback />}>
                <FormBuilder />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/builder/:id"
          element={
            user ? (
              <Suspense fallback={<LoadingFallback />}>
                <FormBuilder />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Auth Routes */}
        <Route
          path="/"
          element={
            !user ? (
              <Login setUser={setUser} />
            ) : (
              user.role === "Super Admin" ? (
                <SuperAdminDashboard superAdminProfile={user} onLogout={handleLogout} />
              ) : (
                <Dashboard userEmail={user.email} userName={user.name} onLogout={handleLogout} />
              )
            )
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;


