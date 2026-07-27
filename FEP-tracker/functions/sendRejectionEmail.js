const { rejectionTemplate } = require("./email_templates");

const sendRejectionEmail = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const db = getFirestore();

    const before = event.data.before?.data() || {};
    const after = event.data.after?.data() || {};

    const beforeRejected = before.rejectedStudents || [];
    const afterRejected = after.rejectedStudents || [];

    const newlyRejected = afterRejected.filter(
      (id) => !beforeRejected.includes(id)
    );

    if (newlyRejected.length === 0) {
      console.log("No new rejections → exit");
      return;
    }

    console.log("Newly rejected students:", newlyRejected);

    const job = after;

    const emailContent = rejectionTemplate(job);
    if (ENABLE_EMAILS) {
      await Promise.all(
        newlyRejected.map(async (userId) => {
          try {
            const userSnap = await db.collection("users").doc(userId).get();
            const user = userSnap.data();

            if (!user?.email) {
              console.log(`User ${userId} missing email`);
              return;
            }

            const emailContent = rejectionTemplate(job);
            await sendEmail({
              to: user.email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html,
            });

            console.log(`Rejection email sent to ${user.email}`);
          } catch (err) {
            console.error(`Failed for user ${userId}:`, err);
          }
        })
      );
    }
  }
);

module.exports = { sendRejectionEmail };