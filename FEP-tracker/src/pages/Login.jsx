/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import "../App.css";
import { useState, useEffect } from "react";
import { auth, provider, database } from "../firebase-config";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut(auth);
        navigate("/");
      } catch (error) {
        console.error("Sign-Out Error:", error);
      }
    };
    handleSignOut();
  }, []);

  return <h2>Signing out...</h2>;
}

function Login() {
  const { user, isRegistered, loading, setIsRegistered } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      if (token) {
        console.log("Token captured and saved!");
        sessionStorage.setItem("google_access_token", token);
      }

      if (!result.user.email.endsWith("@augustana.edu")) {
        await signOut(auth);
        alert("Please use your Augustana school email to sign in.");
        return;
      }

      // Check if their email has been added by admin before letting them in
      const emailKey = result.user.email.toLowerCase();
      const snap = await getDocs(collection(database, "users"));
      const existingUser = snap.docs.find(d => d.data().email === emailKey);

      if (!existingUser) {
        await signOut(auth);
        alert("You have not been added to the system. Please contact your administrator.");
        return;
      }

      console.log(result, "Result");
    } catch (error) {
      console.error("Sign-In Error:", error);
    }
  };

  const handleRegister = async () => {
    if (!user) return;

    const emailKey = user.email.toLowerCase();
    const userRef = doc(database, "users", user.uid);

    try {
      const snap = await getDocs(collection(database, "users"));
      const existingUser = snap.docs.find(d => d.data().email === emailKey);

      if (!existingUser) {
        await signOut(auth);
        alert("You have not been added to the system. Please contact your administrator.");
        return;
      }

      await setDoc(userRef, {
        name: user.displayName,
        email: emailKey,
        role: existingUser.data().role,
        phone: phoneNumber,
        createdAt: new Date(),
      });

      console.log("User registered with role:", existingUser.data().role);
      setIsRegistered(true);
      return navigate("/home"); // Keep as home since the profile will hang if the user is not registered
    } catch (err) {
      console.error("Registration error:", err);
      alert("Something went wrong. Please try again.");
    }
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

export { Login, Logout };