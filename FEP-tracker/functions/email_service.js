const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");


let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_EMAIL.value(),
      pass: GMAIL_PASSWORD.value(),
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    throw new Error("Missing 'to' email");
  }

  console.log("Sending email to:", to);
  console.log("Email subject:", subject);
  console.log("Email text:", text);
  console.log("Email html:", html);
  const mailOptions = {
    from: `"FEP Tracker" <${GMAIL_EMAIL.value()}>`,
    to,
    subject,
    text: text || "",
    html: html || "",
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);

    console.log("✅ Email sent:", {
      to,
      subject,
      messageId: info.messageId,
    });

    return info;
  } catch (err) {
    console.error("❌ Email failed:", {
      to,
      subject,
      error: err.message,
    });
    throw err;
  }
}


async function sendTemplateEmail({ to, template, data }) {
  if (typeof template !== "function") {
    throw new Error("Template must be a function");
  }

  const { subject, text, html } = template(data);

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
};