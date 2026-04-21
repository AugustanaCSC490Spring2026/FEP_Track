import { useEffect, useRef } from "react";
import { useNavigate }  from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { database, auth } from "../firebase-config";

function OAuthCallback() {
  const navigate = useNavigate();
  const hasRun = useRef(false); 

  useEffect(() => {
    if (hasRun.current) return; 
    hasRun.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const uid = auth.currentUser?.uid;

      if (!code || !uid) {
        console.error("Missing code or user:", { code, uid });
        navigate("/");
        return;
      }

      try {
        const res = await fetch(`https://us-central1-fep-tracker.cloudfunctions.net/exchangeGoogleCode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            uid,
            redirectUri: `${window.location.origin}/oauth-callback`
          }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Token exchange failed");

        sessionStorage.setItem("google_access_token", data.access_token);
        sessionStorage.setItem("google_token_expiry", Date.now() + data.expires_in * 1000);

        await updateDoc(doc(database, "users", uid), {
          googleCalendarConnected: true,
          "preferences.showGoogleCalendar": true,
        });

        navigate("/home");
      } catch (err) {
        console.error("OAuth callback failed:", err);
        navigate("/home");
      }
    };

    handleCallback();
  }, []);

  return <p style={{ textAlign: "center", marginTop: "2rem" }}>Connecting Google Calendar...</p>;
}

export default OAuthCallback;