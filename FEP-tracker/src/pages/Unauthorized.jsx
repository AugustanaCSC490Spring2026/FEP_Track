import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database } from "../firebase-config";
import useAuth from "../hooks/useAuth";

export default function Unauthorized() {
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(database, "users", user.uid));
        if (snap.exists()) {
          setNote(snap.data().note || null);
          setUserRole(snap.data().role || null);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [user]);

  const isPending = userRole === "pending";
  const isSuspended = userRole === "suspended";
  const showNote = (isPending || isSuspended) && note;

  return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 36, color: "#111827" }}>
        {isSuspended ? "Account Suspended" : "Access Restricted"}
      </h1>
      <p style={{ color: "#6b7280", fontSize: 20, marginTop: 8 }}>
        {isSuspended
          ? "Your account has been suspended. Please contact your administrator."
          : isPending
          ? "Your account is pending approval. Please check back later."
          : "You are not authorized to view this page."}
      </p>
      {showNote && (
        <div style={{
          marginTop: 24,
          display: "inline-block",
          background: isSuspended ? "#f3e8ff" : "#fef9c3",
          border: `1px solid ${isSuspended ? "#d8b4fe" : "#fde047"}`,
          borderRadius: 10,
          padding: "18px 28px",
          maxWidth: 480,
          textAlign: "left"
        }}>
          <p style={{
            fontSize: 16,
            color: isSuspended ? "#6b21a8" : "#854d0e",
            fontWeight: 600,
            margin: "0 0 6px"
          }}>
            Note from admin:
          </p>
          <p style={{
            fontSize: 16,
            color: isSuspended ? "#581c87" : "#78350f",
            margin: 0
          }}>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}