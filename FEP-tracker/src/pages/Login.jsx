import "../App.css";
import { useState, useEffect } from "react";
import { auth, provider, database } from "../firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'



function Login() {
  const [user, setUser] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [phoneNumber, setPhoneNumber] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          setUser(null)
          setIsRegistered(false)
          setLoading(false)
          return
        }
  
        setUser(currentUser)
  
        const userRef = doc(database, "users", currentUser.uid)

        try {
          const userSnap = await getDoc(userRef)
          setIsRegistered(userSnap.exists())
        } catch (error) {
          console.error("Firestore error:", error)
          setIsRegistered(false)
        }
  
        setLoading(false)
      })

    return () => unsubscribe()
  }, [])

  const handleSignIn = async () => {
    try {
        const result = await signInWithPopup(auth, provider)
        console.log(result, "Result")
    } catch (error) {
        console.log("Sign-In Error:" + error)
    }
  }

  const handleRegister = async () => {
    if (!user) return

    const username = user.email.split("@")[0];
    const hasNumber = /\d/.test(username);
    const role = hasNumber ? "student" : "staff";

    const userRef = doc(database, "users", user.uid)

    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      role: role,
      phone: phoneNumber,
      createdAt: new Date(),
    })

    setIsRegistered(true)
  }

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, "")
    const length = digits.length
  
    if (length < 4) return digits;
    if (length < 7) return `${digits.slice(0,3)}-${digits.slice(3)}`
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`
  }

  const handleLogOut = async () => {
    try {
        await signOut(auth)
        setUser(null)
    } catch (error) {
        console.log("Sign-Out Error:" + error)
    }
  }

  if (loading) return <h2>Loading...</h2>

  return (
    <>
      {!user && (
        <>
          <div
            align="center"
            style={{
              margin: "100px auto",
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
            <input type="tel" placeholder="Enter phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}/>
          <br /><br />
          <button onClick={handleRegister}>Complete Registration</button>
        </div>
      )} 
      {user && isRegistered && (
        <div className="card">
          <h2>Welcome</h2>
          <p>You are signed in as:</p>
          <strong>{user.email}</strong>
          <hr />
          <button onClick={handleLogOut}>Sign Out</button>
        </div>
      )}
    </>
  );
}

export default Login;
