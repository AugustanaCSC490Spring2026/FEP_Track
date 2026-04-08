const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

const moveTimedOutEventsToPending = onSchedule("every 1 hours", async () => {
  const db = getFirestore();
  const now = new Date();
  now.setHours(now.getHours() - 1); // 

  const todayStr = now.toISOString().split("T")[0];
  const cutoffTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  // Fetch all events on past days OR today
  const snapshot = await db
    .collection("upcoming_events")
    .where("date", "<=", todayStr)
    .get();

  if (snapshot.empty) {
    console.log("No timed out events found.");
    return;
  }

  const timedOut = snapshot.docs.filter((doc) => {
    const { date, endTime } = doc.data();
    if (date < todayStr) return true; // Past day — always move
    return endTime <= cutoffTime; // Today — only if end time has passed
  });

  if (timedOut.length === 0) {
    console.log("No timed out events found.");
    return;
  }

  const batch = db.batch();

  timedOut.forEach((doc) => {
    const pendingRef = db.collection("pending_events").doc();
    batch.set(pendingRef, { ...doc.data(), movedAt: new Date() });
    console.log(`Moving event ${doc.data().title} to pending.`);
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Moved ${timedOut.length} events to pending.`);
});
module.exports = { moveTimedOutEventsToPending };
