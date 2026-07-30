const { defineSecret } = require("firebase-functions/params");

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

module.exports = {
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
};  
/* 
use the following commands to access the secrets:
firebase functions:secrets:access GMAIL_EMAIL
firebase functions:secrets:access GMAIL_PASSWORD
*/

/* Define the secrets for the Gmail credentials

you will get prompted to enter the values for each secret.
firebase functions:secrets:set GMAIL_EMAIL
firebase functions:secrets:set GMAIL_PASSWORD
*/