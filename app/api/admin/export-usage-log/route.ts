import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { displayTokens, DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";
import { buildUsageLogRows } from "@/lib/usage-log";

const RECIPIENT = "patrick@idealchamp.com";

export async function POST() {
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const [rows, { data: appSettings }] = await Promise.all([
    buildUsageLogRows(supabase),
    supabase.from("app_settings").select("token_display_markup").eq("id", 1).maybeSingle(),
  ]);
  const tokenMarkup = appSettings?.token_display_markup ?? DEFAULT_TOKEN_DISPLAY_MARKUP;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Usage Log");
  sheet.columns = [
    { header: "User", key: "email", width: 30 },
    { header: "Date joined", key: "joined_at", width: 20 },
    { header: "Lifetime tries", key: "lifetime_tries", width: 14 },
    { header: "Lifetime tokens", key: "lifetime_tokens", width: 16 },
    { header: "Times rated", key: "feedback_count", width: 12 },
    { header: "Latest rating (1-10)", key: "latest_rating", width: 16 },
    { header: "Latest feedback", key: "latest_feedback", width: 50 },
    { header: "Latest feedback at", key: "latest_feedback_at", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      email: row.email,
      joined_at: row.joinedAt,
      lifetime_tries: row.lifetimeTries,
      lifetime_tokens: displayTokens(row.lifetimeTokens, tokenMarkup),
      feedback_count: row.feedbackCount,
      latest_rating: row.latestRating ?? "",
      latest_feedback: row.latestFeedback ?? "",
      latest_feedback_at: row.latestFeedbackAt ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `fb-rewrite-usage-log-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const sent = await sendNotificationEmail(
    "fb-rewrite: usage log export",
    `Attached: the full usage log export (${rows.length} users) as of ${new Date().toLocaleString()}.`,
    {
      to: RECIPIENT,
      attachments: [
        {
          filename,
          content: Buffer.from(buffer),
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    },
  );

  if (!sent) {
    return NextResponse.json(
      { error: "email_not_configured", message: "Export ready, but email isn't configured — nothing was sent." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, count: rows.length, sentTo: RECIPIENT });
}
