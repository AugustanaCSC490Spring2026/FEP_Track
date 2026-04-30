const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_EMAIL.value(),
      pass: GMAIL_PASSWORD.value(),
    },
  });
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: GMAIL_EMAIL.value(),
    to,
    subject,
    text,
    html,
  });

  console.log("Email sent:", subject);
}

module.exports = {
  sendEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
};