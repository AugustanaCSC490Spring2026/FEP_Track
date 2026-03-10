import './App.css'
import Dashboard from './pages/Dashboard'
import AdminDash from './pages/Admin_dashboard'
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth,database } from "./firebase-config";
import Login from "./pages/Login";
import Test from "./pages/test";
import Unauthorized from "./pages/Unauthorized";
import Navbar from "./components/nav";

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
  { path: "/login",      component: Login,    roles: ["any"] },
  { path: "/test",       component: Test,     roles: ["any"] },
  { path: "/dashboard",  component: Dashboard, roles: ["student", "staff"] },
  { path: "/admin",      component: AdminDash, roles: ["staff"] },
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(database, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.exists() ? userSnap.data().role : null;
        setUser({ ...currentUser, role }); // merge Firebase auth user with Firestore role
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <h2>Loading...</h2>;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/test" : "/login"} />} />
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