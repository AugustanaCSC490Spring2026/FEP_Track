/* eslint-disable no-unused-vars */
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route, Navigate } from "react-router-dom";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import { Logout } from './pages/Login';
import Unauthorized from "./pages/Unauthorized";
import Navbar from "./components/nav";
import useAuth from "./hooks/useAuth";
import Students from './pages/students';
import OAuthCallback from './hooks/OAuthCallback';
import PayPeriod from './pages/payperiod';
import Reports from './pages/Reports';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  // No user at all — send to login
  if (!user) {
    return <Navigate to="/profile" />;
  }

  // Blocked roles — send to unauthorized
  if (
    user?.role === "pending" ||
    user?.role === "unauthorized" ||
    user?.role === "suspended"
  ) {
    return <Navigate to="/unauthorized" />;
  }

  if (!allowedRoles.includes("any") && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

const routes = [
  { path: "/home",      component: Home,      roles: ["any"] },
  { path: "/payperiod", component: PayPeriod, roles: ["admin", "student"] },
  { path: "/reports",   component: Reports,   roles: ["admin", "staff"] },
];

function App() {
  const { user, loading } = useAuth();

  if (user?.role === "admin") {
    routes.push({ path: "/students", component: Students, roles: ["admin"] });
  }

  if (loading) return <h2>Loading...</h2>;

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Navigate to={
          !user ? "/profile" :
          user.role === "pending" || user.role === "suspended" || user.role === "unauthorized"
            ? "/unauthorized"
            : "/home"
        } />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        {routes.map(({ path, component: Component, roles }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute user={user} allowedRoles={roles}>
                <Component user={user} />
              </ProtectedRoute>
            }
          />
        ))}
      </Routes>
    </>
  );
}

export default App;