/**
 * ReserveX — Email Notification Service
 * Uses Resend API for transactional emails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "ReserveX DSW <noreply@reservex.dev>";
const APP_NAME = "ReserveX";

interface EmailResult {
  success: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Failed to send:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("[Email] Network error:", err);
    return { success: false, error: "Network error" };
  }
}

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #1e3a5f; padding: 32px 40px; text-align: center; }
    .header h1 { color: white; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0; }
    .body { padding: 40px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .status-pending { background: #dbeafe; color: #2563eb; }
    .status-confirmed { background: #dcfce7; color: #16a34a; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .status-cancelled { background: #f1f5f9; color: #64748b; }
    h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
    .detail { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 12px; color: #64748b; font-weight: 500; }
    .detail-value { font-size: 13px; color: #0f172a; font-weight: 500; }
    .footer { padding: 24px 40px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
    .cta { display: inline-block; padding: 10px 24px; background: #1e3a5f; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 8px; }
    .cta:hover { background: #162d4a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Venue Booking System · DSW Office, VIT</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>This is an automated message from ${APP_NAME}. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function statusBadge(status: string): string {
  const cls = status === "CONFIRMED" ? "status-confirmed" : status === "REJECTED" ? "status-rejected" : status === "CANCELLED" ? "status-cancelled" : "status-pending";
  return `<span class="status ${cls}">${status.replace("_", " ")}</span>`;
}

// ============================================================
// Notification: Booking Submitted
// ============================================================
export async function notifyBookingSubmitted(
  toEmail: string,
  toName: string,
  eventTitle: string,
  bookingId: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2>Booking Request Submitted</h2>
    <p>Hi ${toName},</p>
    <p>Your venue booking request has been submitted and is now pending Faculty Coordinator review.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge("PENDING_FC")}</span></div>
    </div>
    <p>You will receive another email when your request is reviewed.</p>
  `);
  return sendEmail(toEmail, `[ReserveX] Booking Submitted: ${eventTitle}`, html);
}

// ============================================================
// Notification: FC Approved → Forwarded to DSW
// ============================================================
export async function notifyFCApproved(
  toEmail: string,
  toName: string,
  eventTitle: string,
  bookingId: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2>Booking Forwarded to DSW</h2>
    <p>Hi ${toName},</p>
    <p>Good news! Your Faculty Coordinator has approved your booking request. It has been forwarded to the Dean of Student Welfare (DSW) for final approval and equipment allocation.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge("PENDING_DSW")}</span></div>
    </div>
    <p>You will be notified once DSW makes a decision.</p>
  `);
  return sendEmail(toEmail, `[ReserveX] Forwarded to DSW: ${eventTitle}`, html);
}

// ============================================================
// Notification: Booking Confirmed
// ============================================================
export async function notifyBookingConfirmed(
  toEmail: string,
  toName: string,
  eventTitle: string,
  bookingId: string,
  venueName: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2>Booking Confirmed! ✅</h2>
    <p>Hi ${toName},</p>
    <p>Your venue booking has been officially confirmed by DSW. You can now proceed with your event.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venueName}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge("CONFIRMED")}</span></div>
    </div>
    <p>Use the QR codes in your booking dashboard for event check-in.</p>
    <a class="cta" href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${bookingId}">View Booking Details</a>
  `);
  return sendEmail(toEmail, `[ReserveX] Confirmed: ${eventTitle}`, html);
}

// ============================================================
// Notification: Booking Rejected
// ============================================================
export async function notifyBookingRejected(
  toEmail: string,
  toName: string,
  eventTitle: string,
  rejectedBy: string,
  reason: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2>Booking Request Declined</h2>
    <p>Hi ${toName},</p>
    <p>Your venue booking request has been declined.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Declined by</span><span class="detail-value">${rejectedBy}</span></div>
      <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason || "No reason provided"}</span></div>
    </div>
    <p>If you believe this is an error or would like to discuss further, please contact the relevant authority.</p>
  `);
  return sendEmail(toEmail, `[ReserveX] Declined: ${eventTitle}`, html);
}

// ============================================================
// Notification: Auto-Cancelled (deadline missed)
// ============================================================
export async function notifyAutoCancelled(
  toEmail: string,
  toName: string,
  eventTitle: string,
  reason: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2>Booking Automatically Cancelled</h2>
    <p>Hi ${toName},</p>
    <p>Your booking request for <strong>${eventTitle}</strong> has been automatically cancelled.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>
    </div>
    <p>Please submit a new request if you still need the venue.</p>
  `);
  return sendEmail(toEmail, `[ReserveX] Auto-Cancelled: ${eventTitle}`, html);
}
