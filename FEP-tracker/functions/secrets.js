const { defineSecret } = require("firebase-functions/params");

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

module.exports = {
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
};  