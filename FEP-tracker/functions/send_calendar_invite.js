const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { calendarAssignedTemplate } = require("./email_templates")
const { GMAIL_EMAIL, GMAIL_PASSWORD, sendEmail } = require("./email_service");



exports.sendCalendarInvite = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {

    const db = getFirestore();

    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeStudents = before.students || [];
    const afterStudents = after.students || [];

    const newStudents = afterStudents.filter(
      (id) => !beforeStudents.includes(id)
    );

    if (newStudents.length === 0) {
      console.log("No new approvals → exit");
      return;
    }


    const job = after;

    for (const userId of newStudents) {
      try {
        const userSnap = await db.collection("users").doc(userId).get();
        const user = userSnap.data();

        if (!user?.googleCalendarConnected) {
          console.log(`User ${userId} not connected to Google`);
          continue;
        }

        const tokenRes = await fetch(
          "https://us-central1-fep-tracker.cloudfunctions.net/refreshGoogleToken",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: userId }),
          }
        );

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.access_token) {
          continue;
        }

        const accessToken = tokenData.access_token;

        const eventBody = {
            summary: job.title,
            location: job.location || "TBD",
            description: job.extra_details || "",

            start: {
                dateTime: buildDateTime(job.date, job.startTime),
                timeZone: "America/Chicago",
            },

            end: {
                dateTime: buildDateTime(job.date, job.endTime),
                timeZone: "America/Chicago",
            },

            attendees: [{ email: user.email }],
            };

        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          continue;
        }

       console.log(" Calendar invite created:", data.id);

       console.log(calendarAssignedTemplate)
        const emailContent = calendarAssignedTemplate(job);

        await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        });
      } catch (err) {
        console.error(`Failed for user ${userId}`, err);
      }
    }
  }
);

function buildDateTime(date, time) {
  return `${date}T${time}:00`;
}
