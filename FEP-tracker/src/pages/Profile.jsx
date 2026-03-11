import { Login } from "./Login";
import Student from "./Dashboard";
import Admin from "./Admin_dashboard";
import useAuth from "../hooks/useAuth";

export default function Profile() {
  const { user, isRegistered, loading } = useAuth();
  console.log("Profile - User:", user, "Is Registered:", isRegistered, "Loading:", loading);
  if (loading) return <p>Loading...</p>;

  if (!user) return <Login />;

  if (!isRegistered) return <Login />; 

  return user.role === "student"
    ? <Student user={user} />
    : <Admin user={user} />;
}