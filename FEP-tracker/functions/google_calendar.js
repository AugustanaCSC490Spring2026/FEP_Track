const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");


exports.exchangeGoogleCode = onRequest(
  { cors: true, secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (req, res) => {
    const db = getFirestore();
    const { code, uid, redirectUri } = req.body;


    if (!code || !uid) {
      return res.status(400).json({ error: "Missing code or uid" });
    }

    const params = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID.value(),
      client_secret: GOOGLE_CLIENT_SECRET.value(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error_description });
      }

      await db.collection("users").doc(uid).set(
        {
          googleRefreshToken: tokenData.refresh_token,
          googleCalendarConnected: true,
        },
        { merge: true }
      );

      return res.json({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
      });
    } catch (err) {
      console.error("Token exchange error:", err);
      return res.status(500).json({ error: "Token exchange failed" });
    }
  }
);

exports.refreshGoogleToken = onRequest(
  { cors: true, secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (req, res) => {
    const db = getFirestore();
    const { uid } = req.body;

    if (!uid) return res.status(400).json({ error: "Missing uid" });

    try {
      const userSnap = await db.collection("users").doc(uid).get();
      const refreshToken = userSnap.data()?.googleRefreshToken;

      if (!refreshToken) {
        return res.status(404).json({ error: "No refresh token found" });
      }

      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID.value(),
        client_secret: GOOGLE_CLIENT_SECRET.value(),
        grant_type: "refresh_token",
      });

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error_description });
      }

      return res.json({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
      });
    } catch (err) {
      console.error("Token refresh error:", err);
      return res.status(500).json({ error: "Token refresh failed" });
    }
  }
);