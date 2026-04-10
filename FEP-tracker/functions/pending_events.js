const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

const moveTimedOutEventsToPending = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Chicago",
  },
  async () => {
    const db = getFirestore();
    const TIMEZONE = "America/Chicago";
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    const localTime = now.toLocaleTimeString("en-GB", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    console.log(`Running check. Local time: ${todayStr} ${localTime}`);
    now.setHours(now.getHours() - 1); // Look back 1 hour to catch any events that may have been missed in the last check
    const cutoffTime = now.toLocaleTimeString("en-GB", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
       console.log({ total: snapshot.size, today: todayStr, cutoffTime, eventDate: date, eventEndTime: endTime });
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
  },
);
module.exports = { moveTimedOutEventsToPending };
