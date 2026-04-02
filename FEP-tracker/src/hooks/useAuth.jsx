import { useState, useEffect } from "react";
import { auth, database } from "../firebase-config";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function useAuth() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userRef = doc(database, "users", currentUser.uid);

        // Listen for real-time changes to the user's Firestore document
        unsubscribeSnapshot = onSnapshot(userRef, (userSnap) => {
          const role = userSnap.exists() ? userSnap.data().role : null;
          const exists = userSnap.exists();

          console.log("useAuth - Role:", role, "Exists:", exists);

          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: role,
          });

          setIsRegistered(exists);
          setLoading(false);
        });
      } else {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        setUser(null);
        setIsRegistered(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return { user, isRegistered, loading, setIsRegistered };
}