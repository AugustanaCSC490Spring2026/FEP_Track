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

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user && !allowedRoles.includes("any")) {
    return <Navigate to="/unauthorized" />;
  }
  if (user?.role === "pending" || user?.role === "unauthorized") {
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
]; //role check is starting to feel  redundant

function App() {
  const { user, loading } = useAuth();
  if (user?.role === "staff") {
    routes.push({ path: "/students", component: Students, roles: ["staff"] });
  }//protects the students page from being added to the nav if the user is not staff but also protects the route itself from being accessed by non staff users
  if (loading) return <h2>Loading...</h2>;
  routes
  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/home" : "/profile"} />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/logout" element={<Logout />} />
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