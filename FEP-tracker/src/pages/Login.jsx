/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import "../App.css";
import { useState, useEffect } from "react";
import { auth, provider, database } from "../firebase-config";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
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

      const emailKey = result.user.email.toLowerCase();
      const snap = await getDocs(collection(database, "users"));
      const existingDoc = snap.docs.find(d => d.data().email?.toLowerCase() === emailKey);

      if (!existingDoc) {
        await signOut(auth);
        alert("You have not been added to the system. Please contact your administrator.");
        return;
      }

      // If doc exists but uses a different ID (admin created it), migrate it to their uid
      if (existingDoc.id !== result.user.uid) {
        const existingData = existingDoc.data();
        await setDoc(doc(database, "users", result.user.uid), {
          ...existingData,
          name: result.user.displayName,
          email: emailKey,
          lastLogin: new Date(),
        });
        await deleteDoc(doc(database, "users", existingDoc.id));
      }

    } catch (error) {
      console.error("Sign-In Error:", error);
    }
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
    </>
  );
}

export { Login, Logout };