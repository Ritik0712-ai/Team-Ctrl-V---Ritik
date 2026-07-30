import nodemailer from "nodemailer";

export async function sendBookingNotificationEmail(params: {
  eventTitle: string;
  clubName: string;
  venueName: string;
  date: string;
  timeRange: string;
}) {
  const { SMTP_USER, SMTP_PASS, TEST_RECEIVER_EMAIL } = process.env;

  if (!SMTP_USER || !SMTP_PASS || !TEST_RECEIVER_EMAIL) {
    console.error("Missing SMTP credentials or receiver email in .env.local");
    return { success: false, error: "Missing config" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"ReserveX Notifications" <${SMTP_USER}>`,
    to: TEST_RECEIVER_EMAIL,
    subject: `New Venue Booking Request: ${params.eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">New Booking Request</h2>
        <p style="color: #475569; font-size: 16px;">
          A new venue booking request has been submitted by <strong>${params.clubName}</strong> and requires your approval.
        </p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #334155;">Event Details:</h3>
          <ul style="color: #475569; padding-left: 20px;">
            <li><strong>Event:</strong> ${params.eventTitle}</li>
            <li><strong>Venue:</strong> ${params.venueName}</li>
            <li><strong>Date:</strong> ${params.date}</li>
            <li><strong>Time:</strong> ${params.timeRange}</li>
          </ul>
        </div>
        
        <p style="color: #475569; font-size: 14px;">
          Please log into the <a href="http://localhost:3000/dashboard" style="color: #2563eb;">ReserveX Dashboard</a> to review and approve this request.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: ", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email: ", error);
    return { success: false, error };
  }
}
