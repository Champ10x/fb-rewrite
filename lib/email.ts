import nodemailer from "nodemailer";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/**
 * Sends a notification email using SMTP credentials from env vars. Silently
 * no-ops (returns false) if SMTP isn't configured — callers whose main flow
 * doesn't depend on the email being sent should ignore the return value.
 */
export async function sendNotificationEmail(
  subject: string,
  text: string,
  options?: { to?: string; attachments?: EmailAttachment[] },
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = options?.to || process.env.ADMIN_NOTIFY_EMAIL || user;

  if (!host || !port || !user || !pass || !to) {
    console.warn("sendNotificationEmail skipped — SMTP env vars not configured");
    return false;
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
      attachments: options?.attachments,
    });
    return true;
  } catch (err) {
    console.error("sendNotificationEmail failed (non-fatal)", err);
    return false;
  }
}
