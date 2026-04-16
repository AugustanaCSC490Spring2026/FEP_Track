import { Login } from "./Login";
import Student from "./Dashboard";
import Admin from "./Admin_dashboard";
import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Profile() {
  const { user, isRegistered, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Login />;
  if (!isRegistered) return <Login />;

  if (user.role === "pending" || user.role === "unauthorized" || user.role === "suspended") {
    return <Navigate to="/unauthorized" />;
  }

  return user.role === "student"
    ? <Student user={user} />
    : user.role === "staff" || user.role === "admin"
    ? <Admin user={user} />
    : <Navigate to="/unauthorized" />;
}