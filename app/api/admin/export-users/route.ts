import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { displayTokens, DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";

const RECIPIENT = "patrick@idealchamp.com";

export async function POST() {
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const [{ data: profiles, error }, { data: posts }, { data: appSettings }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("posts").select("user_id, analyses(rewrite_tokens_used, image_tokens_used)"),
    supabase.from("app_settings").select("token_display_markup").eq("id", 1).maybeSingle(),
  ]);
  const tokenMarkup = appSettings?.token_display_markup ?? DEFAULT_TOKEN_DISPLAY_MARKUP;

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Could not load the user database" }, { status: 500 });
  }

  const lifetimeByUser = new Map<string, { tries: number; tokens: number }>();
  for (const post of posts ?? []) {
    if (!post.user_id) continue;
    const entry = lifetimeByUser.get(post.user_id) ?? { tries: 0, tokens: 0 };
    entry.tries += 1;
    for (const analysis of post.analyses ?? []) {
      entry.tokens += (analysis.rewrite_tokens_used ?? 0) + (analysis.image_tokens_used ?? 0);
    }
    lifetimeByUser.set(post.user_id, entry);
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
    { header: "Lifetime tries", key: "lifetime_tries", width: 14 },
    { header: "Lifetime tokens", key: "lifetime_tokens", width: 16 },
    { header: "User ID", key: "id", width: 38 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const profile of profiles ?? []) {
    const lifetime = lifetimeByUser.get(profile.id) ?? { tries: 0, tokens: 0 };
    sheet.addRow({
      ...profile,
      lifetime_tries: lifetime.tries,
      lifetime_tokens: displayTokens(lifetime.tokens, tokenMarkup),
    });
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
