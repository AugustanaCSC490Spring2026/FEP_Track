import './App.css'
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Unauthorized from "./pages/Unauthorized";
import Navbar from "./components/nav";
import useAuth from "./hooks/useAuth";
import Students from './pages/students';
const ProtectedRoute = ({ user, allowedRoles, children }) => {
  console.log("ProtectedRoute - User:", user, "Allowed Roles:", allowedRoles);
  if (!user && !allowedRoles.includes("any")) {
    return <Navigate to="/login" />;
  }
  if (allowedRoles[0] !== "any" && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};

const routes = [
  { path: "/home",       component: Home,     roles: ["any"] },
  { path: "/profile",    component: Profile,  roles: ["any"] },
  { path: "/students",   component: Students, roles: ["any"] }

];

function App() {
  const { user, loading } = useAuth();
   


  if (loading) return <h2>Loading...</h2>;

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/home" : "/profile"} />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

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