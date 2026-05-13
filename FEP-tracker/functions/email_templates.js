
function formatTimeRange(timeRange) {
  if (!timeRange) return "TBD";

  const [start, end] = timeRange.split("–").map(t => t.trim());

  return `${toAMPM(start)} – ${toAMPM(end)}`;
}

function toAMPM(time24) {
  if (!time24) return "TBD";

  const [h, m] = time24.split(":");
  let hour = parseInt(h);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${m} ${ampm}`;
}


function newJobTemplate(job) {
  return {
    subject: `New FEP Opportunity: ${job.title}`,

    text: `
FEP TRACKER NOTIFICATION

A new job opportunity has been posted.

Title: ${job.title}
Department: ${job.department || "TBD"}
Location: ${job.location || "TBD"}
Date: ${job.date || "TBD"}
Time: ${formatTimeRange(job.time)}

Additional Information:
${job.extra_details || "None provided"}

Please log in to view details and apply.
    `,

    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto; background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        
        <div style="background:#2563eb; padding:14px; color:white;">
          <h2 style="margin:0;">New FEP Opportunity</h2>
        </div>

        <div style="padding:18px;">

          <p>A new job opportunity has been posted.</p>

          <div style="background:#f3f4f6; padding:12px; border-radius:6px;">
            <p><strong>Title:</strong> ${job.title}</p>
            <p><strong>Department:</strong> ${job.department || "TBD"}</p>
            <p><strong>Location:</strong> ${job.location || "TBD"}</p>
            <p><strong>Date:</strong> ${job.date || "TBD"}</p>
            <p><strong>Time:</strong> ${formatTimeRange(job.time)}</p>
          </div>

          <p style="margin-top:12px;"><strong>Extra Information: </strong>
            ${job.extra_details || "No additional information provided."}
          </p>

          <p style="margin-top:16px; font-size:12px; color:#6b7280;">
            Please log in to the FEP Tracker dashboard to apply.
          </p>

        </div>
      </div>
    `
  };
}

function spotOpenedTemplate(job) {
  return {
    subject: `Spot Available: ${job.title}`,

    text: `
FEP TRACKER NOTIFICATION

A spot has opened for the following job.

Title: ${job.title}
Department: ${job.department || "TBD"}
Location: ${job.location || "TBD"}
Date: ${job.date || "TBD"}
Time: ${formatTimeRange(job.time)}

Additional Information:
${job.extra_details || "None provided."}

Log in to claim this position.
    `,

    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">

        <div style="background:#dc2626; color:white; padding:14px;">
          <h2 style="margin:0;">Spot Now Available</h2>
        </div>

        <div style="padding:18px;">

          <p>A spot has just opened for the following job:</p>

          <div style="background:#f3f4f6; padding:12px; border-radius:6px;">
            <p><strong>Title:</strong> ${job.title}</p>
            <p><strong>Department:</strong> ${job.department || "TBD"}</p>
            <p><strong>Location:</strong> ${job.location || "TBD"}</p>
            <p><strong>Date:</strong> ${job.date || "TBD"}</p>
            <p><strong>Time:</strong> ${formatTimeRange(job.time)}</p>
          </div>

          <div style="margin-top:16px;">
            <p style="margin:0 0 6px 0; font-weight:bold;">
              Additional Information
            </p>
            <p style="margin:0; color:#374151;">
              ${job.extra_details || "None provided."}
            </p>
          </div>

          <p style="margin-top:16px; font-size:12px; color:#6b7280;">
            Log in to the FEP Tracker dashboard to claim this spot.
          </p>

        </div>
      </div>
    `
  };
}

function calendarAssignedTemplate(job, calendarAdded = false) {
  const calendarTextLine = calendarAdded
    ? "This job has also been added to your Google Calendar."
    : "To have future jobs automatically added to your Google Calendar, connect your account on the home page.";

  const calendarHtmlLine = calendarAdded
    ? `<p style="margin:0;"> This job has been added to your Google Calendar.</p>`
    : `<p style="margin:0;"> Want jobs added to your Google Calendar automatically? Connect your Google Calendar on the home page.</p>`;

  return {
    subject: `Job Assignment Confirmed: ${job.title}`,

    text: `
Job Assignment Confirmed

You have been successfully assigned to a job.

----------------------------------------

Job Title:   ${job.title || "TBD"}
Department:  ${job.department || "TBD"}
Location:    ${job.location || "TBD"}
Date:        ${job.date || "TBD"}
Time:        ${formatTimeRange(job.time) || "TBD"}

----------------------------------------

Additional Information:
${job.extra_details || "None provided"}

----------------------------------------

${calendarTextLine}

If you have any questions, please contact your supervisor.
    `,

    html: `
<div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">

  <div style="background:#0d6efd; color:white; padding:14px;">
    <h2 style="margin:0;">Job Assignment Confirmed</h2>
  </div>

  <div style="padding:18px;">

    <p>You have been successfully assigned to a job.</p>

    <div style="background:#f3f4f6; padding:12px; border-radius:6px;">
      <p style="margin:0 0 6px 0;"><strong>Job Title:</strong> ${job.title || "TBD"}</p>
      <p style="margin:0 0 6px 0;"><strong>Department:</strong> ${job.department || "TBD"}</p>
      <p style="margin:0 0 6px 0;"><strong>Location:</strong> ${job.location || "TBD"}</p>
      <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${job.date || "TBD"}</p>
      <p style="margin:0;"><strong>Time:</strong> ${formatTimeRange(job.time) || "TBD"}</p>
    </div>

    <div style="margin-top:16px;">
      <p style="margin:0 0 6px 0; font-weight:bold;">Additional Information</p>
      <p style="margin:0;">${job.extra_details || "None provided"}</p>
    </div>

    <div style="margin-top:16px; background:#f3f4f6; padding:12px; border-radius:6px;">
      ${calendarHtmlLine}
    </div>

    <p style="margin-top:16px; font-size:12px; color:#6b7280;">
      If you have any questions, please contact your supervisor.
    </p>

  </div>
</div>
    `,
  };
}

function newUserTemplate(user) {
  return {
    subject: "Welcome to FEP Tracker",

    text: `
Welcome to FEP Tracker!

Your account has been successfully created.

You can now log in and begin applying for available jobs.

----------------------------------------

Email: ${user.email || "Your registered email"}

----------------------------------------

Next Steps:
- Log in to the platform
- Browse available jobs
- Connect your Google Calendar (optional)

If you have any questions, please contact your administrator.

Welcome aboard!
    `,

    html: `
<div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">

  <div style="background:#16a34a; color:white; padding:14px;">
    <h2 style="margin:0;">Welcome to FEP Tracker</h2>
  </div>

  <div style="padding:18px;">

    <p>Your account has been successfully created.</p>

    <div style="background:#f3f4f6; padding:12px; border-radius:6px;">
      <p><strong>Email:</strong> ${user.email || "Your registered email"}</p>
    </div>

    <div style="margin-top:16px;">
      <p style="margin:0 0 6px 0; font-weight:bold;">Next Steps</p>
      <ul style="margin:0; padding-left:18px;">
        <li>Log in to the platform</li>
        <li>Browse available jobs</li>
        <li>Connect your Google Calendar (optional)</li>
      </ul>
    </div>

    <p style="margin-top:16px; font-size:12px; color:#6b7280;">
      If you have any questions, please contact your administrator.
    </p>

  </div>
</div>
    `,
  };
}

module.exports = {
  newJobTemplate,
  spotOpenedTemplate,
  calendarAssignedTemplate,
  newUserTemplate,
};
