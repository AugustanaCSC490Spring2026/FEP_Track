import './App.css'
import Dashboard from './pages/Dashboard'
import AdminDash from './pages/Admin_dashboard'
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase-config";

import Login from "./pages/Login";
import Test from "./pages/test";
import Unauthorized from "./pages/Unauthorized";
import Navbar from "./components/nav";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); //Check if user is logged in or not, and set the user state accordingly

  if (loading) return <h2>Loading...</h2>;
 



  
  return (

    
    <>
    <Navbar/>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} /> {/* If not logged in, show login page */}
        <Route path="/" element={user ? <Test /> : <Navigate to="/login" />} /> {/* If logged in, show test page, otherwise redirect to login */}
        {/* Means we will need to make a landing page seperate for using the app.jsx as the main landing */}

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/admin" element={ !user ? <Navigate to="/login" /> : <AdminDash user={user} /> } />

         {/* This route will be used to log out the user, you can add a button that redirects to this route and also calls the signOut function from firebase auth */}
        {/* <Route path="/admin" element={user && user.role === "admin" ? <AdminDash user={user} /> : <Navigate to="/unauthorized" />} /> */}{/* Admin dashboard route, only accessible if user is logged in and has admin role */}
      </Routes>
    </>
    
  );
}

export default App;