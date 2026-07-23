const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const {
  sendEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
} = require("./email_service");

const { newUserTemplate } = require("./email_templates");
const ENABLE_EMAILS = true;

const sendNewUserEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const user = event.data.data();

    if (!user?.email) {
      console.log("No email → skipping");
      return;
    }

    if (user.isMigration === true) {
      console.log(`Migration detected for ${user.email} → skipping welcome email`);
      return;
    }

    console.log("New user created → sending email");

    if (ENABLE_EMAILS){
        try {
        const email = newUserTemplate(user);

        const info = await sendEmail({
            to: user.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });
       
        } catch (err) {
        console.error(" Failed to send new user email:", err);
        }
    }
  }
);


module.exports = { sendNewUserEmail };