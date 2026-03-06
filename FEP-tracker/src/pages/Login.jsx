import '../App.css'
import { useState, useEffect } from 'react'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { auth, provider, database } from '../firebase-config'
import { doc, getDoc, setDoc } from "firebase/firestore"

function Login() {
  const [user, setUser] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [extraInfo, setExtraInfo] = useState("")

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
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.log("Sign-In Error:" + error)
    }
  }

  const handleRegister = async () => {
    if (!user) return

    const userRef = doc(database, "users", user.uid)
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      extraInfo: extraInfo,
      createdAt: new Date(),
    })

    setIsRegistered(true)
  }

  if (loading) return <h2>Loading...</h2>

  return (
    <>
      {!user && (
        <div className="card">
          <h2>Please Sign In</h2>
          <hr />
          <button onClick={handleSignIn}>Sign in with Google</button>
        </div>
      )}

      {user && !isRegistered && (
        <div className="card">
          <h2>Please Register Account</h2>
          <p>Welcome {user.displayName}!</p>
          <input
            type="text"
            placeholder="Enter additional info"
            onChange={(e) => setExtraInfo(e.target.value)}
          />
          <br /><br />
          <button onClick={handleRegister}>Complete Registration</button>
        </div>
      )}
    </>
  )
}

export default Login

