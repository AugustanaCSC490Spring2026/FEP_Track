const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { sendEmail, GMAIL_EMAIL, GMAIL_PASSWORD } = require("./email_service");
const { spotOpenedTemplate } = require("./email_templates");

exports.sendSpotOpenedEmail = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeCount = (before.students || []).length;
    const afterCount = (after.students || []).length;


    if (afterCount >= beforeCount) return;

    console.log("Spot opened → sending email");

    const email = spotOpenedTemplate(after);

    await sendEmail({
      to: GMAIL_EMAIL.value(), // T
      ...email,
    });
  }
);

// const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
// const { sendEmail, GMAIL_EMAIL, GMAIL_PASSWORD } = require("./email_service");
// const { spotOpenedTemplate } = require("./email_templates");

// exports.sendSpotOpenedEmail = onDocumentUpdated(
//   {
//     document: "upcoming_events/{jobId}",
//     secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
//   },
//   async (event) => {
//     try {
//       console.log("=== CASE 2 TRIGGER FIRED ===");

//       const before = event.data.before.data();
//       const after = event.data.after.data();

//       const beforeStudents = before.students || [];
//       const afterStudents = after.students || [];

//       console.log("BEFORE:", JSON.stringify(beforeStudents));
//       console.log("AFTER:", JSON.stringify(afterStudents));

//       // 🔥 robust diff detection (this is the key fix)
//       const removedStudents = beforeStudents.filter(
//         (id) => !afterStudents.includes(id)
//       );

//       console.log("Removed students:", removedStudents);

//       if (removedStudents.length === 0) {
//         console.log("No student removed → exiting");
//         return;
//       }

//       console.log("Spot opened → sending email");

//       const email = spotOpenedTemplate(after);

//       await sendEmail({
//         to: GMAIL_EMAIL.value(), // later: replace with real recipients
//         ...email,
//       });

//       console.log("EMAIL SENT SUCCESSFULLY");
//     } catch (err) {
//       console.error("CASE 2 FAILED:", err);
//     }
//   }
// );