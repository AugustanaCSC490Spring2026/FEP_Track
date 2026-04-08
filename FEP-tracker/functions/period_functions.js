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

  const startdate = today.toISOString().split("T")[0];
  const enddate = twoWeeksLater.toISOString().split("T")[0];

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
    console.log(`Processing completed event: ${eventId} on ${eventData.date}`);
    const snapshot = await db
      .collection("periods")
      .where("startdate", "<=", eventData.date)
      .get();
    

    if (snapshot.empty) {
      console.log(`No period found for date: ${eventData.date}`);
      return;
    }
    const filtered = snapshot.docs.filter((doc) => {
      const { startdate, enddate } = doc.data();
      return startdate <= eventData.date && enddate >= eventData.date;
    });

    if (filtered.length === 0) {
      console.log(`No period found that includes date: ${eventData.date}`);
      return;
    }

    const doc = filtered[0];
    const period = new Period({ id: doc.id, ...doc.data() });

    period.setAttendance(eventId, eventData?.attendance);

    await db.collection("periods").doc(period.id).update(period.toFirestore());
    console.log(`Period updated for event on ${eventData}`);
  }
);

module.exports = { periodCreated, periodUpdated };