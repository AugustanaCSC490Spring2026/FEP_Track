const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");
const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");
const admin = require("firebase-admin");
admin.initializeApp();
let transporter = null;
const { FieldPath } = require("firebase-admin/firestore");
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
const database = admin.firestore();

async function getStudentsNames(studentIds) {
  if (!studentIds.length) return [];
  const snapshot = await database
    .collection("users")
    .where(FieldPath.documentId(), "in", studentIds)
    .get();
  console.log("Retrieved students:", snapshot.docs.length);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getEmailsByRole(role, excludeIds = null) {
  if (!role) {
    throw new Error("Missing 'role'");
  }

  let query = database.collection("users").where("role", "==", role);

  if (excludeIds && excludeIds.length > 0) {
    if (excludeIds.length <= 30) {
      query = query.where(FieldPath.documentId(), "not-in", excludeIds);
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => doc.data().email).filter(Boolean);
    } else {
      // over 30 - not-in won't work, fall back to fetch-all + filter
      const excludeSet = new Set(excludeIds);
      const snapshot = await query.get();
      return snapshot.docs
        .filter((doc) => !excludeSet.has(doc.data().id))
        .map((doc) => doc.data().email)
        .filter(Boolean);
    }
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data().email).filter(Boolean);
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
  getEmailsByRole,
  getStudentsNames
};
