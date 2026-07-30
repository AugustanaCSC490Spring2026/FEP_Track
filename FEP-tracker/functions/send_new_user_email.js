const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const {
  sendTemplateEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
} = require("./email_service");

const { newUserTemplate } = require("./email_templates");

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
      console.log(
        `Migration detected for ${user.email} → skipping welcome email`,
      );
      return;
    }

    console.log("New user created → sending email");

    try {
      const info = await sendTemplateEmail({
        to: user.email,
        template: newUserTemplate,
        data: user,
      });
    } catch (err) {
      console.error(" Failed to send new user email:", err);
    }
  },
);

module.exports = { sendNewUserEmail };
