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

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user && !allowedRoles.includes("any")) {
    return <Navigate to="/unauthorized" />;
  }
  if (
    user?.role === "pending" ||
    user?.role === "unauthorized" ||
    user?.role === "suspended"
  ) {
    return <Navigate to="/unauthorized" />;
  }
  if (allowedRoles[0] !== "any" && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};

const routes = [
  { path: "/home",     component: Home,     roles: ["any"] },
  { path: "/profile",  component: Profile,  roles: ["any"] },
];

function App() {
  const { user, loading } = useAuth();

  if (user?.role === "admin") {
    routes.push({ path: "/students", component: Students, roles: ["admin"] });
  } // protects the students page from being added to the nav if the user is not admin

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