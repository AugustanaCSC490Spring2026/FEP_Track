import './App.css'
import { useState, useEffect } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import React from 'react'
import { auth, provider, database } from './firebase-config'
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
        const result = await signInWithPopup(auth, provider)
        console.log(result, "Result")
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
            <input type="text" placeholder="Enter additional info" onChange={(e) => setExtraInfo(e.target.value)}/>
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
  )
}

export default Login