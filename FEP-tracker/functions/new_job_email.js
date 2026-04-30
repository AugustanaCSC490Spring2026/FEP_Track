const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { sendEmail, GMAIL_EMAIL, GMAIL_PASSWORD } = require("./email_service");
const { newJobTemplate } = require("./email_templates");

exports.sendJobEmail = onDocumentCreated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const job = event.data.data();

    console.log("New job detected → sending email");

    const email = newJobTemplate(job);

    await sendEmail({
      to: GMAIL_EMAIL.value(), //TEMP
      ...email,
    });
  }
);