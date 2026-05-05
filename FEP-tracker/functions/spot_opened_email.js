const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

const {
  sendEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
} = require("./email_service"); 

const { spotOpenedTemplate } = require("./email_templates");
const ENABLE_EMAILS = false;


exports.sendSpotOpenedEmail = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const before = event.data.before?.data() || {};
    const after = event.data.after?.data() || {};

    const beforeCount = (before.students || []).length;
    const afterCount = (after.students || []).length;

    if (afterCount >= beforeCount) {
      return;
    }

    console.log("Spot opened → sending email");
    if (ENABLE_EMAILS){
      try {
        const email = spotOpenedTemplate(after);

        await sendEmail({
          to: GMAIL_EMAIL.value(),
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        console.log(" Spot opened email sent");
      } catch (err) {
        console.error(" Failed to send spot opened email:", err);
      }
    }
  }
);