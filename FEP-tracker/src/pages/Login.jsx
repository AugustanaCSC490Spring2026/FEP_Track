import "../App.css";
import { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, provider, database } from "../firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";



function Login() {
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extraInfo, setExtraInfo] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsRegistered(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const userRef = doc(database, "users", currentUser.uid);
      try {
        const userSnap = await getDoc(userRef);
        setIsRegistered(userSnap.exists());
      } catch (error) {
        console.error("Firestore error:", error);
        setIsRegistered(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.log("Sign-In Error:" + error);
    }
  };

  const handleRegister = async () => {
    if (!user) return;

    const userRef = doc(database, "users", user.uid);
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      extraInfo: extraInfo,
      createdAt: new Date(),
      phone: user.phoneNumber || null,
      role: "admin",
    });

    setIsRegistered(true);
  };

  if (loading) return <h2>Loading...</h2>;

  return (
    <>
      {!user && (
        <>
          <div
            align="center"
            style={{
              margin: "50% auto",
              width: "500px",
            }}
          >
            <Card className="text-center">
              <Card.Header>Sign In</Card.Header>
              <Card.Body>
                {/* <Card.Title>Special title treatment</Card.Title> */}
                <Card.Text>
                  <Button variant="primary" onClick={handleSignIn}>
                    Sign In
                  </Button>{" "}
                  <br />
                  Sign in with your Augustana email to access the FEP Tracker.
                </Card.Text>
              </Card.Body>
            </Card>
          </div>
        </>
      )}

      {/* Couldnt edit this becuase of the role requirement */}
      {user && !isRegistered && (
        <div className="card">
          <h2>Please Register Account</h2>
          <p>Welcome {user.displayName}!</p>
          <input
            type="text"
            placeholder="Enter additional info"
            onChange={(e) => setExtraInfo(e.target.value)}
          />
          <br />
          <br />
          <button onClick={handleRegister}>Complete Registration</button>
        </div>
      )}
    </>
  );
}

export default Login;
