import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";

const RECIPIENT = "patrick@idealchamp.com";

export async function POST() {
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Could not load the user database" }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");
  sheet.columns = [
    { header: "Email", key: "email", width: 30 },
    { header: "Date joined", key: "created_at", width: 20 },
    { header: "Credits/week", key: "weekly_credit_allocation", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Expiry", key: "expiry_date", width: 20 },
    { header: "IP address", key: "ip_address", width: 18 },
    { header: "Browser", key: "browser", width: 30 },
    { header: "Referral", key: "referral", width: 20 },
    { header: "Admin", key: "is_admin", width: 10 },
    { header: "User ID", key: "id", width: 38 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const profile of profiles ?? []) {
    sheet.addRow(profile);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `fb-rewrite-users-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const sent = await sendNotificationEmail(
    "fb-rewrite: user database export",
    `Attached: the full user database export (${profiles?.length ?? 0} users) as of ${new Date().toLocaleString()}.`,
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

  return NextResponse.json({ ok: true, count: profiles?.length ?? 0, sentTo: RECIPIENT });
}
