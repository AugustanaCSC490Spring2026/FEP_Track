const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

const moveTimedOutEventsToPending = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 03:00
    timeZone: "America/Chicago",
  },
  async () => {
    const db = getFirestore();
    const TIMEZONE = "America/Chicago";
    const todayStr = new Date(
      new Date().toLocaleString("en-US", { timeZone: TIMEZONE }),
    )
      .toISOString()
      .split("T")[0];
    // Fetch all events on past days from upcoming_events
    const snapshot = await db
      .collection("upcoming_events")
      .where("date", "<", todayStr)
      .get();

    if (snapshot.empty) {
      console.log("No timed out events found.");
      return;
    }

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      const pendingRef = db.collection("pending_events").doc();
      batch.set(pendingRef, { ...doc.data(), movedAt: new Date() })
      const { date } = doc.data();
      console.log({ message: `Moving event ${doc.data().title} ${date} to pending.` });
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Moved total of ${snapshot.size} at ${todayStr}  events to pending.`);
  },
);
module.exports = { moveTimedOutEventsToPending };
