const { rejectionTemplate } = require("./email_templates");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const {
  sendTemplateEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
  getEmailsByRole,
  getStudents
} = require("./email_service");

const sendRejectionEmail = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const db = getFirestore();

    const before = event.data.before?.data() || {};
    const after = event.data.after?.data() || {};
    const beforeRejected = before.pending_students || [];
    const afterRejected = after.pending_students || [];
    const newlyRejected = afterRejected.filter(
      (id) =>
        !beforeRejected.includes(id) && !event.data.after.students.includes(id),
    );

    if (newlyRejected.length === 0) {
      console.log("No new rejections → exit");
      return;
    }

    console.log("Newly rejected students:", newlyRejected);

    const job = after;

    await Promise.all(
      newlyRejected.map(async (userId) => {
        try {
          const userSnap = await db.collection("users").doc(userId).get();
          const user = userSnap.data();

          if (!user?.email) {
            console.log(`User ${userId} missing email`);
            return;
          }

          await sendTemplateEmail({
            to: user.email,
            template: rejectionTemplate,
            data: job,
          });

          console.log(`Rejection email sent to ${user.email}`);
        } catch (err) {
          console.error(`Failed for user ${userId}:`, err);
        }
      }),
    );
  },
);

module.exports = { sendRejectionEmail };
