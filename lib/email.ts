import nodemailer from "nodemailer";

/**
 * Sends a notification email using SMTP credentials from env vars. Silently
 * no-ops if SMTP isn't configured — this must never block the caller's main
 * flow (e.g. saving a quota request).
 */
export async function sendNotificationEmail(subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ADMIN_NOTIFY_EMAIL || user;

  if (!host || !port || !user || !pass || !to) {
    console.warn("sendNotificationEmail skipped — SMTP env vars not configured");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("sendNotificationEmail failed (non-fatal)", err);
  }
}
