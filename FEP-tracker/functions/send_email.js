const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");


function formatTimeRange(timeRange) {
  if (!timeRange) return "TBD";

  const [startRaw, endRaw] = timeRange.split("–").map(t => t.trim());

  return `${formatTimeToAMPM(startRaw)} – ${formatTimeToAMPM(endRaw)}`;
}

function formatTimeToAMPM(time24) {
  if (!time24) return "TBD";

  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

exports.sendJobEmail = onDocumentCreated(
  {
    document: "upcoming_events/{jobId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (event) => {
    console.log("EMAIL TRIGGER FIRED");

    const job = event.data.data();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_EMAIL.value(),
        pass: GMAIL_PASSWORD.value(),
      },
    });

    await transporter.sendMail({
    from: GMAIL_EMAIL.value(),
    to: GMAIL_EMAIL.value(),
    subject: `New FEP Opportunity: ${job.title}`,

    text: `
    FEP TRACKER NOTIFICATION

    A new job opportunity has been posted in the FEP Tracker system.

    Job Details
    -------------------------
    Title: ${job.title || "TBD"}
    Department: ${job.department || "TBD"}
    Location: ${job.location || "TBD"}
    Date: ${job.date || "TBD"}
    Time: ${formatTimeRange(job.time) || "TBD"}

    Additional Information
    -------------------------
    ${job.extra_details || "No additional information provided."}

    Next Steps
    -------------------------
    Please log in to the FEP Tracker dashboard to view full details and apply.

    This is an automated message from FEP Tracker. Please do not reply.
    `,

    html: `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f9fafb; padding: 24px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

        <div style="background-color: #2563eb; padding: 16px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">
            New FEP Opportunity
            </h2>
        </div>

        <div style="padding: 20px; color: #111827;">

            <p style="margin-top: 0;">
            A new job opportunity has been posted in the FEP Tracker system.
            </p>

            <div style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-radius: 6px;">
            <p style="margin: 6px 0;"><strong>Title:</strong> ${job.title || "TBD"}</p>
            <p style="margin: 6px 0;"><strong>Department:</strong> ${job.department || "TBD"}</p>
            <p style="margin: 6px 0;"><strong>Location:</strong> ${job.location || "TBD"}</p>
            <p style="margin: 6px 0;"><strong>Date:</strong> ${job.date || "TBD"}</p>
            <p style="margin: 6px 0;"><strong>Time:</strong> ${formatTimeRange(job.time) || "TBD"}</p>
            </div>

    
            <div style="margin-top: 16px;">
            <p style="margin-bottom: 6px;"><strong>Additional Information</strong></p>
            <p style="margin-top: 0; color: #374151;">
                ${job.extra_details || "No additional information provided."}
            </p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
            <p style="margin-bottom: 12px; color: #6b7280;">
                Please log in to the FEP Tracker dashboard to view full details and apply.
            </p>
            </div>

        </div>

        <!-- Footer -->
        <div style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; background-color: #f3f4f6;">
            This is an automated message from FEP Tracker. Please do not reply.
        </div>

        </div>
    </div>
    `
    });

    console.log("EMAIL SENT");
  }
);