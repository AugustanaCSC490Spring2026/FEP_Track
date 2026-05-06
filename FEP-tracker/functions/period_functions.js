const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const Period = require("./period");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const periodCreated = onSchedule(
  {
    schedule: "0 0 * * 1", // Every Monday at 00:00
    timeZone: "America/Chicago",
  },
  async () => {
    const today = new Date();
    const db = getFirestore(); //first get the last period to check if the new period needs to be created, if the last period's end date is before today then create a new period
    const snapshot = await db
      .collection("periods")
      .orderBy("enddate", "desc")
      .limit(1)
      .get();
    let lastEndDate = null;

    if (!snapshot.empty) {
      const lastPeriod = snapshot.docs[0].data();
      lastEndDate = new Date(lastPeriod.enddate);
    }
    let nextStart = lastEndDate ? new Date(lastEndDate) : new Date(today);

    if (lastEndDate) {
      nextStart.setDate(nextStart.getDate() + 1);
    }
    while (nextStart <= today) {//this loop will create as many periods as needed to catch up to the current date, in case the function was not run for a while its kind of a failsafe
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextEnd.getDate() + 13); // 14-day period

      const startStr = nextStart.toISOString().split("T")[0];
      const endStr = nextEnd.toISOString().split("T")[0];

      const period = new Period({
        date: today.toISOString().split("T")[0],
        startdate: startStr,
        enddate: endStr,
        attendance: {},
      });

      await db.collection("periods").add(period.toFirestore());
      console.log(`Period created: ${startStr} → ${endStr}`);

      console.log(`Created: ${startStr} → ${endStr}`);
      nextStart.setDate(nextStart.getDate() + 14);
    }
  },
);

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
      .where("enddate", ">=", eventData.date)
      .get();

    if (snapshot.empty) {
      console.log(`No period found for date: ${eventData.date}`);
      return;
    }
  /*   const filtered = snapshot.docs.filter((doc) => {
      const { startdate, enddate } = doc.data();
      return startdate <= eventData.date && enddate >= eventData.date;
    }); */

   /*  if (filtered.length === 0) {
      console.log(`No period found that includes date: ${eventData.date}`);
      return;
    } */

    const doc = snapshot.docs[0];
    const period = new Period({ id: doc.id, ...doc.data() });

    period.setAttendance(eventId, eventData?.attendance);

    await db.collection("periods").doc(period.id).update(period.toFirestore());
    console.log(`Period updated for event on ${eventData}`);
  },
);

module.exports = { periodCreated, periodUpdated };
