/* eslint-disable no-unused-vars */
import "../App.css";
import { useState, useEffect } from "react";
import { auth, provider, database } from "../firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

function Welcome() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;
  if (!user) return null;
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  return (
    <div className="card">
      <h2>Welcome, {user.displayName}</h2>
      <p>You are signed in as:</p>
      <strong>{user.email}</strong>
      <hr />
      <Button variant="danger" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}

function Login() {
  const { user, isRegistered, loading ,setIsRegistered} = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log(result, "Result");
    } catch (error) {
      console.error("Sign-In Error:", error);
    }
  };
  const navigate = useNavigate();
  const handleRegister = async () => {
    if (!user) return;

    const username = user.email.split("@")[0];
    const hasNumber = /\d/.test(username);
    const role = hasNumber ? "student" : "staff";

    const userRef = doc(database, "users", user.uid);

    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      role: role,
      phone: phoneNumber,
      createdAt: new Date(),
    });

    console.log("User registered with role:", role);
    setIsRegistered(true);
    return navigate("/home"); //Keep as home since the profile will hang if the user is not registered, so we want to redirect them to home after registration.
  };

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, "");
    const len = digits.length;
    if (len < 4) return digits;
    if (len < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  if (loading) return <h2>Loading...</h2>;

  return (
    <>
      {!user && (
        <div align="center" style={{ margin: "100px auto", width: "500px" }}>
          <Card className="text-center">
            <Card.Header>Sign In</Card.Header>
            <Card.Body>
              <Card.Text>
                <Button variant="primary" onClick={handleSignIn}>
                  Sign In
                </Button>
                <br />
                Sign in with your Augustana email to access the FEP Tracker.
              </Card.Text>
            </Card.Body>
          </Card>
        </div>
      )}

      {user && !isRegistered && (
        <div className="card">
          <h2>Please Register Account</h2>
          <p>Welcome {user.displayName}!</p>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
          />
          <br />
          <br />
          <button onClick={handleRegister}>Complete Registration</button>
        </div>
      )}
    </>
  );
}

export { Login, Welcome };
