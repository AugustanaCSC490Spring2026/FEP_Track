const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");



const moveTimedOutEventsToPending = onSchedule("0 2 * * *", 
  // 2:00 AM every day
  async () => {
  const db = getFirestore();
  const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoff = yesterday.toISOString().split("T")[0];
    //to avoid race conditions of clocked in events being moved to pending, we only move events that are strictly before the current date (not including today)
  const snapshot = await db
    .collection("upcoming_events")
    .where("date", "<", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("No timed out events found.");
    return;
  }

  const moves = snapshot.docs.map(async (doc) => {
    const data = doc.data();

    await db.collection("pending_events").add({
      ...data,
      movedAt: new Date().toISOString(),
    });//move the event to pending_events collection

    await doc.ref.delete();//delete the event from upcoming_events collection
  });

  await Promise.all(moves);

  console.log(`Moved ${snapshot.docs.length} events to pending.`);
});

module.exports = { moveTimedOutEventsToPending };