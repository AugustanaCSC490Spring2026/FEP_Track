const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const {
  sendTemplateEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
  getEmailsByRole
} = require("./email_service");

const { newJobTemplate } = require("./email_templates");
const ENABLE_EMAILS = true;


const sendJobEmail = onDocumentCreated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    console.log(" NEW JOB EMAIL TRIGGER");

    const job = event.data.data();
    const students = await getEmailsByRole("student");
    if (!job) {
      console.log("No job data → exit");
      return;
    }
    if (ENABLE_EMAILS){
      try {
        
        await sendTemplateEmail({
          to: students, 
          template: newJobTemplate,
          data: job,
        });

        console.log(" Job email sent",students.length);
      } catch (err) {
        console.error(" Failed to send job email:", err);
      }
    }
  }
);
module.exports = { sendJobEmail };