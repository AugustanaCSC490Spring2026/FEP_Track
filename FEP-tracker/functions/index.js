const { initializeApp } = require("firebase-admin/app");
const { exchangeGoogleCode, refreshGoogleToken } = require("./google_calendar");

const { moveTimedOutEventsToPending } = require("./pending_events");
const { periodCreated, periodUpdated } = require("./period_functions");
const { setGlobalOptions } = require("firebase-functions");
const { sendJobEmail } = require("./new_job_email");
const { sendSpotOpenedEmail } = require("./spot_opened_email");
const { sendCalendarInvite } = require("./send_calendar_invite");
const { sendNewUserEmail } = require("./send_new_user_email");
const { sendRejectionEmail } = require('./sendRejectionEmail');

initializeApp();
setGlobalOptions({ maxInstances: 10 });

// Register the functions you make in here
exports.moveTimedOutEventsToPending = moveTimedOutEventsToPending;
exports.periodCreated = periodCreated;
exports.periodUpdated = periodUpdated;
exports.exchangeGoogleCode = exchangeGoogleCode;
exports.refreshGoogleToken = refreshGoogleToken;
exports.sendJobEmail = sendJobEmail;
exports.sendSpotOpenedEmail = sendSpotOpenedEmail;
exports.sendCalendarInvite = sendCalendarInvite;
exports.sendNewUserEmail = sendNewUserEmail;
exports.sendRejectionEmail = sendRejectionEmail;
