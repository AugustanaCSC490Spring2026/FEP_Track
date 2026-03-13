import { useState, useEffect } from "react";
import { auth, database } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function useAuth() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(database, "users", currentUser.uid);
        console.log(userRef.role, "User Reference Role");
        const userSnap = await getDoc(userRef);
        console.log(userSnap.data(), "User Snapshot Data");
        const role = userSnap.exists() ? userSnap.data().role : null;
        const exists = userSnap.exists();

        console.log(
          "useAuth - Role:",
          role,
          "Exists:",
          exists,
          "User Snap:",
          userSnap.data(),
        );
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          role: role,
        });
        setIsRegistered(exists);
      } else {
        setUser(null);
        setIsRegistered(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);
  console.log(
    "useAuth - User:",
    user,
    "Is Registered:",
    isRegistered,
    "Loading:",
    loading,
  );

  return { user, isRegistered, loading, setIsRegistered };
}
