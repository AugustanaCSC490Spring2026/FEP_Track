const { initializeApp } = require("firebase-admin/app");

const { moveTimedOutEventsToPending } = require("./pending_events");
const { periodCreated, periodUpdated } = require("./period_functions");
const { setGlobalOptions } = require("firebase-functions");
initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.moveTimedOutEventsToPending = moveTimedOutEventsToPending;
exports.periodCreated = periodCreated;
exports.periodUpdated = periodUpdated;
