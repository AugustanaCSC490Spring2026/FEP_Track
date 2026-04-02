const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");



const moveTimedOutEventsToPending = onSchedule("every 24 hours", async () => {
  const db = getFirestore();
  const today = new Date().toISOString().split("T")[0];

  const snapshot = await db
    .collection("upcoming_events")
    .where("date", "<", today)
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