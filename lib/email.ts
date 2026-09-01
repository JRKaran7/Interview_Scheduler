import { Resend } from "resend";
import nodemailer from "nodemailer";

export interface SendReminderResult {
  success: boolean;
  email: string;
  error?: string;
}

// ─── Transport Helper ────────────────────────────────────────────────────────
// Priority:
// 1. Brevo REST API (100% Free - 300 emails/day to ANY domain, no custom domain required!)
// 2. Outlook / Microsoft 365 SMTP
// 3. Gmail SMTP
// 4. Resend API

async function sendHtmlEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const brevoKey = process.env.BREVO_API_KEY;

  // 1. Prefer Brevo REST API (Free, high deliverability to all university/Outlook inboxes)
  if (brevoKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || "karan.rajankar07@gmail.com";
      const senderName  = process.env.BREVO_SENDER_NAME || "Interview Scheduler";

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(`[EMAIL] Successfully sent email to ${to} via Brevo API (Message ID: ${data.messageId}).`);
        return { success: true };
      } else {
        const errMsg = data.message || JSON.stringify(data);
        console.error(`[EMAIL] Brevo API returned error for ${to}:`, errMsg);
        // Fall through to next providers if Brevo fails
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL] Brevo fetch exception for ${to}:`, msg);
    }
  }

  // 2. Outlook / Microsoft 365 SMTP fallback
  const outlookUser = process.env.OUTLOOK_USER;
  const outlookPass = process.env.OUTLOOK_PASS;
  if (outlookUser && outlookPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: { user: outlookUser, pass: outlookPass },
        tls: { ciphers: "SSLv3", rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from: `"Interview Scheduler" <${outlookUser}>`,
        to,
        subject,
        html,
      });

      console.log(`[EMAIL] Successfully sent email to ${to} via Outlook SMTP.`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL] Outlook SMTP failed for ${to}:`, msg);
    }
  }

  // 3. Gmail SMTP fallback
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });

      await transporter.sendMail({
        from: `"Interview Scheduler" <${gmailUser}>`,
        to,
        subject,
        html,
      });

      console.log(`[EMAIL] Successfully sent email to ${to} via Gmail SMTP.`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL] Gmail SMTP failed for ${to}:`, msg);
    }
  }

  // 4. Resend API fallback
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to,
        subject,
        html,
      });

      if (error) {
        console.error(`[EMAIL] Resend API failed for ${to}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[EMAIL] Successfully sent email to ${to} via Resend.`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL] Resend API exception for ${to}:`, msg);
      return { success: false, error: msg };
    }
  }

  return {
    success: false,
    error: "No working email provider credentials configured.",
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendReminderEmail(
  studentEmail: string,
  date: string,
  time: string
): Promise<SendReminderResult> {
  const result = await sendHtmlEmail(
    studentEmail,
    `Reminder: Your Interview is Tomorrow at ${time}`,
    buildReminderHtml(studentEmail, date, time)
  );

  return {
    success: result.success,
    email: studentEmail,
    error: result.error,
  };
}

export async function sendBookingConfirmationEmail(
  studentEmail: string,
  studentNumber: string,
  date: string,
  time: string
): Promise<SendReminderResult> {
  const result = await sendHtmlEmail(
    studentEmail,
    `Interview Booking Confirmation: ${date} at ${time}`,
    buildConfirmationHtml(studentEmail, studentNumber, date, time)
  );

  return {
    success: result.success,
    email: studentEmail,
    error: result.error,
  };
}

export async function sendCancellationEmail(
  studentEmail: string,
  studentNumber: string,
  date: string,
  time: string
): Promise<SendReminderResult> {
  const result = await sendHtmlEmail(
    studentEmail,
    `Interview Booking Cancelled: ${date} at ${time}`,
    buildCancellationHtml(studentEmail, studentNumber, date, time)
  );

  return {
    success: result.success,
    email: studentEmail,
    error: result.error,
  };
}

function buildCancellationHtml(
  studentEmail: string,
  studentNumber: string,
  date: string,
  time: string
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Booking Cancelled</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0f14;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0f14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#1a1f2e;border-radius:16px;border:1px solid rgba(148,163,184,0.12);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444 0%,#f97316 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);letter-spacing:0.1em;text-transform:uppercase;">Interview Scheduler</p>
              <h1 style="margin:12px 0 0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">Booking Cancelled</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;line-height:1.7;">Hi Student (${studentNumber}),</p>
              <p style="margin:0 0 28px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Your interview reservation has been successfully cancelled and reopened for other students:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#13161e;border-radius:12px;border:1px solid rgba(148,163,184,0.10);margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#f87171;letter-spacing:0.08em;text-transform:uppercase;">Released Slot</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#f1f5f9;">${date} &bull; ${time}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">If this was a mistake, you can log back into the portal at any time to choose a new slot.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

function buildReminderHtml(
  studentEmail: string,
  date: string,
  time: string
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Interview Reminder</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d0f14;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0f14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#1a1f2e;border-radius:16px;border:1px solid rgba(148,163,184,0.12);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Interview Scheduler</p>
              <h1 style="margin:12px 0 0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">Your Interview is Tomorrow</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">Hi there,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                This is a friendly reminder that your interview is scheduled for <strong style="color:#ffffff;">tomorrow</strong>. Please make sure you are prepared and available on time.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#13161e;border-radius:12px;border:1px solid rgba(148,163,184,0.10);margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:2px;">
                          <div style="width:8px;height:8px;border-radius:50%;background-color:#6366f1;margin-top:5px;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">Date</p>
                          <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#f1f5f9;">${date}</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="height:1px;background-color:rgba(148,163,184,0.08);font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:2px;">
                          <div style="width:8px;height:8px;border-radius:50%;background-color:#10b981;margin-top:5px;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">Time</p>
                          <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#f1f5f9;">${time}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;line-height:1.6;">If you have any questions or need to make changes, please contact your coordinator as soon as possible.</p>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Good luck tomorrow! 🎯</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(148,163,184,0.08);">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;text-align:center;">
                This is an automated reminder from the Interview Scheduler system.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildConfirmationHtml(
  studentEmail: string,
  studentNumber: string,
  date: string,
  time: string
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Booking Confirmation</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d0f14;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0f14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#1a1f2e;border-radius:16px;border:1px solid rgba(148,163,184,0.12);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#6366f1 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);letter-spacing:0.1em;text-transform:uppercase;">Interview Scheduler</p>
              <h1 style="margin:12px 0 0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">Booking Confirmed! 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;line-height:1.7;">Hi Student (${studentNumber}),</p>
              <p style="margin:0 0 28px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Your interview slot has been successfully booked. Below are the details of your appointment:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#13161e;border-radius:12px;border:1px solid rgba(148,163,184,0.10);margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:2px;">
                          <div style="width:8px;height:8px;border-radius:50%;background-color:#6366f1;margin-top:5px;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">Date</p>
                          <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#f1f5f9;">${date}</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="height:1px;background-color:rgba(148,163,184,0.08);font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:2px;">
                          <div style="width:8px;height:8px;border-radius:50%;background-color:#10b981;margin-top:5px;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">Time</p>
                          <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#f1f5f9;">${time}</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="height:1px;background-color:rgba(148,163,184,0.08);font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:2px;">
                          <div style="width:8px;height:8px;border-radius:50%;background-color:#818cf8;margin-top:5px;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">Student Number</p>
                          <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#f1f5f9;">${studentNumber}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;line-height:1.6;">You will also receive an automated reminder email 1 day before your scheduled interview.</p>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Good luck! 🎯</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(148,163,184,0.08);">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;text-align:center;">
                This is an automated confirmation from the Interview Scheduler system.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
