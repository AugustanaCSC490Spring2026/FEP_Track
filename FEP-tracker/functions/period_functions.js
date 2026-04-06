const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const Period = require("./period");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const periodCreated = onSchedule({
  schedule: "0 8 1,15 * *",
  timeZone: "America/Chicago",
}, async () => {
  const today = new Date();
  const db = getFirestore();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);

  const startdate = today.toISOString().split("T")[0] + "T08:00:00Z";
  const enddate = twoWeeksLater.toISOString().split("T")[0] + "T16:00:00Z";

  const period = new Period({
    date: today.toISOString().split("T")[0],
    startdate: startdate,
    enddate: enddate,
    attendance: {},
  });

  await db.collection("periods").add(period.toFirestore());
  console.log(`Period created: ${startdate} → ${enddate}`);
});

const periodUpdated = onDocumentCreated(
  "completed_events/{completed_eventId}",
  async (event) => {
    const db = getFirestore();
    const eventData = event.data.data();
    const eventId = event.params.completed_eventId;

    const snapshot = await db
      .collection("periods")
      .where("startdate", "<=", eventData.date)
      .where("enddate", ">=", eventData.date)
      .get();

    if (snapshot.empty) {
      // console.log(`No period found for date: ${eventData.date}`);
      return;
    }

    const doc = snapshot.docs[0];
    const period = new Period({ id: doc.id, ...doc.data() });

    period.setStudents(eventId, eventData?.attendance);

    await db.collection("periods").doc(period.id).update(period.toFirestore());
    // console.log(`Period updated for event on ${eventData.date}`);
  }
);

module.exports = { periodCreated, periodUpdated };