const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const {
  sendEmail,
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
  getEmailsByRole,
  getStudents,
} = require("./email_service");

const {
  spotOpenedTemplate,
  spotOpenedTemplateAdmin,
  droppedOrRemovedTemplate,
} = require("./email_templates");

const sendSpotOpenedEmail = onDocumentUpdated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    const before = event.data.before?.data() || {};
    const after = event.data.after?.data() || {};

    const beforeStudents = before.students || [];
    const afterStudents = after.students || [];

    if (afterStudents.length >= beforeStudents.length) {
      return; // no drop happened
    }

    console.log("Before students:", beforeStudents);
    console.log("After students:", afterStudents);
    // find who actually left in the case of a removal only they should be notified differently
    const droppedIds = beforeStudents.filter(
      (id) => !afterStudents.includes(id),
    );

    if (droppedIds.length === 0) {
      console.log("Count dropped but no removed ID found → exit");
      return;
    }

    console.log("Spot opened → student(s) dropped:", droppedIds);

    const droppedUsers = await getStudents(droppedIds);
    console.log("Dropped users:", droppedUsers);
    const droppedUserEmails = droppedUsers
      .map((user) => user.email)
      .filter(Boolean);
    console.log("Dropped user emails:", droppedUserEmails);

    try {
      const admins = await getEmailsByRole("admin");
      let students = await getEmailsByRole("student", afterStudents); // exclude currently-assigned students
      students = students.filter((email) => !droppedUserEmails.includes(email)); // also exclude dropped students, they get their own email

      console.log("Filtered student emails:", students);
      const studentEmail = spotOpenedTemplate(after);
      await sendEmail({
        to: students,
        subject: studentEmail.subject,
        text: studentEmail.text,
        html: studentEmail.html,
      });
      console.log("Spot opened email sent to", students.length, "students");

      const adminEmail = spotOpenedTemplateAdmin(after, droppedUsers);
      await sendEmail({
        to: admins,
        subject: adminEmail.subject,
        text: adminEmail.text,
        html: adminEmail.html,
      });
      if (droppedUserEmails.length > 0) {
        const droppedOrRemoved = droppedOrRemovedTemplate(after, droppedUsers);
        await sendEmail({
          to: droppedUserEmails,
          subject: droppedOrRemoved.subject,
          text: droppedOrRemoved.text,
          html: droppedOrRemoved.html,
        });
      }
      console.log(
        "Admin notified of drop:",
        droppedUsers.map((u) => u.email || u.id),
      );
    } catch (err) {
      console.error("Failed to send spot opened email:", err);
    }
  },
);
module.exports = { sendSpotOpenedEmail };
