import { useState, useEffect } from "react";
import { auth, database } from "../firebase-config";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function useAuth() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userRef = doc(database, "users", currentUser.uid);

        unsubscribeSnapshot = onSnapshot(userRef, (userSnap) => {
          if (!userSnap.exists()) {
            setUser(null);
            setIsRegistered(false);
            setLoading(false);
            return;
          }

          const role = userSnap.data().role;
          console.log("useAuth - Role:", role, "Exists:", true);

          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: role,
          });

          setIsRegistered(true);
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