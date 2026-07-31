/**
 * ReserveX — Email Notification Service
 * Uses Nodemailer with SMTP
 */
import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = "ReserveX DSW <" + (SMTP_USER || "noreply@reservex.dev") + ">";

interface EmailResult {
  success: boolean;
  error?: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[Email] SMTP not configured — skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Send error:", err);
    return { success: false, error: err.message };
  }
}

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 20px; font-size: 12px; color: #666; }
    .cta { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>ReserveX Notifications</h2>
  </div>
  ${content}
  <div class="footer">
    <p>This is an automated message from ReserveX. Please do not reply.</p>
  </div>
</body>
</html>`;
}

export async function sendBookingNotificationEmail(data: {
  eventTitle: string;
  clubName: string;
  venueName: string;
  date: string;
  timeRange: string;
}): Promise<EmailResult> {
  const subject = `New Booking Request: ${data.eventTitle}`;
  const html = wrapHtml(`
    <h3>New Booking Request Requires Approval</h3>
    <p><strong>Event:</strong> ${data.eventTitle}</p>
    <p><strong>Club/Organizer:</strong> ${data.clubName}</p>
    <p><strong>Venue:</strong> ${data.venueName}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Time:</strong> ${data.timeRange}</p>
    <br/>
    <p>Please log in to the dashboard to review and approve this request.</p>
    <a class="cta" href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/approvals">View Approvals</a>
  `);
  
  // Hardcoded to send to DSW/FC (simulate)
  const dswEmail = "dhakad2000prem@gmail.com";
  return sendEmail(dswEmail, subject, html);
}

export async function sendBookingStatusUpdateEmail(data: {
  eventTitle: string;
  requesterEmail: string;
  status: "APPROVED" | "REJECTED" | "FORWARDED";
  reason?: string;
  bookingId: string;
}): Promise<EmailResult> {
  const actionText = 
    data.status === "APPROVED" ? "has been fully approved by DSW!" : 
    data.status === "REJECTED" ? "has been rejected." : 
    "has been approved by FC and forwarded to DSW.";

  const subject = `Booking Update: ${data.eventTitle}`;
  const html = wrapHtml(`
    <h3>Booking Update</h3>
    <p>Your booking request for <strong>${data.eventTitle}</strong> ${actionText}</p>
    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
    <br/>
    <a class="cta" href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${data.bookingId}">View Booking Details</a>
  `);

  return sendEmail(data.requesterEmail, subject, html);
}
