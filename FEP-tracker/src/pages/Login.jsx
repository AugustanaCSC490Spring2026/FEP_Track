/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import "../App.css";
import { useState, useEffect } from "react";
import { auth, provider, database } from "../firebase-config";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
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

  return (
    <Container className="text-center mt-5">
      <h2>Signing out...</h2>
    </Container>
  );
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

  if (loading) {
    return (
      <Container className="text-center" style={{ marginTop: "150px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h3 className="mt-3">Loading...</h3>
      </Container>
    );
  }

  return (
    <>
      {!user && (
        <Container style={{ marginTop: "80px" }}>
          <Row className="justify-content-center">
            <Col md={6} lg={5}>
              {/* Main Login Card */}
              <Card className="shadow-lg border-0" style={{ padding: "0"}}> 
                <Card.Header className="bg-primary text-white text-center ">
                  <h2 className="mb-1">FEP Tracker</h2>
                  <p className="mb-0 small">Field Experience Program</p>
                </Card.Header>
                
                <Card.Body>
                  <h4 className="text-center mb-3">Welcome Back</h4>
                  <p className="text-center text-muted mb-4">
                    Sign in with your Augustana email to continue
                  </p>

                  <div className="d-grid gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="lg"
                      onClick={handleSignIn}
                      className="d-flex align-items-center justify-content-center gap-2 py-3"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </Button>
                  </div>

                  <Alert variant="info" className="mt-4 mb-0">
                    <Alert.Heading className="h6 mb-2">
                      <i className="bi bi-info-circle me-2"></i>
                      Important
                    </Alert.Heading>
                    <p className="mb-0 small">
                      Only <strong>@augustana.edu</strong> email addresses are accepted. 
                      If you need access, please contact your administrator.
                    </p>
                  </Alert>
                </Card.Body>

                <Card.Footer className="bg-light text-center text-muted py-3">
                  <small>
                    © {new Date().getFullYear()} Augustana College
                  </small>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </>
  );
}

export { Login, Logout };