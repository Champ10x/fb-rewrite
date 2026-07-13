import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { AdminSubNav } from "@/components/admin-subnav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F1E3] md:flex-row">
      <Sidebar isAdmin />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Admin</h1>
          <p className="mt-1 mb-6 text-sm text-neutral-500">Users, quota, platform settings, and admin access.</p>
          <AdminSubNav />
          {children}
        </div>
      </main>
    </div>
  );
}
