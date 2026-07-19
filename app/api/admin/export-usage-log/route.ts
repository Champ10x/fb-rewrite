import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { displayTokens } from "@/lib/tokens";

const RECIPIENT = "patrick@idealchamp.com";

export async function POST() {
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const [{ data: entries, error }, { data: profiles }] = await Promise.all([
    supabase.from("session_feedback").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email"),
  ]);

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Could not load the usage log" }, { status: 500 });
  }

  const emailFor = (userId: string) => profiles?.find((p) => p.id === userId)?.email ?? userId;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Usage Log");
  sheet.columns = [
    { header: "When", key: "created_at", width: 20 },
    { header: "User", key: "email", width: 30 },
    { header: "Rating (1-10)", key: "rating", width: 14 },
    { header: "Feedback", key: "feedback", width: 50 },
    { header: "Session tries", key: "session_tries", width: 14 },
    { header: "Session tokens", key: "session_tokens_used", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const entry of entries ?? []) {
    sheet.addRow({
      created_at: entry.created_at,
      email: emailFor(entry.user_id),
      rating: entry.rating,
      feedback: entry.feedback ?? "",
      session_tries: entry.session_tries ?? "",
      session_tokens_used: entry.session_tokens_used != null ? displayTokens(entry.session_tokens_used) : "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `fb-rewrite-usage-log-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const sent = await sendNotificationEmail(
    "fb-rewrite: usage log export",
    `Attached: the full usage log export (${entries?.length ?? 0} entries) as of ${new Date().toLocaleString()}.`,
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

  return NextResponse.json({ ok: true, count: entries?.length ?? 0, sentTo: RECIPIENT });
}
