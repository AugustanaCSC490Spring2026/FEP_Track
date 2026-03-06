import { Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Test from "../pages/test";
import Unauthorized from "../pages/Unauthorized";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user && !allowedRoles.includes("any")) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles[0] !== "any" && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

function AppRoutes({ user }) {
  const routes = [
    { path: "/login", component: Login, roles: ["any"] },
    { path: "/test", component: Test, roles: ["any"] },
  ];

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {routes.map((route) => {
        const Component = route.component;

        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute user={user} allowedRoles={route.roles}>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      })}
    </Routes>
  );
}

export default AppRoutes;
