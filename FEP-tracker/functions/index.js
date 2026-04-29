const { initializeApp } = require("firebase-admin/app");
const { exchangeGoogleCode, refreshGoogleToken } = require("./google_calendar");

const { moveTimedOutEventsToPending } = require("./pending_events");
const { periodCreated, periodUpdated } = require("./period_functions");
const { sendJobEmail } = require("./send_email");
const { setGlobalOptions } = require("firebase-functions");


initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.moveTimedOutEventsToPending = moveTimedOutEventsToPending;
exports.periodCreated = periodCreated;
exports.periodUpdated = periodUpdated;
exports.exchangeGoogleCode = exchangeGoogleCode;
exports.refreshGoogleToken = refreshGoogleToken;
exports.sendJobEmail = sendJobEmail;