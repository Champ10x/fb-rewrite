"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/audit", label: "Activity Log" },
    { href: "/welcome", label: "Learn more" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <aside className="w-full shrink-0 border-b border-neutral-200 bg-white p-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="mb-6">
        <Logo size="small" />
      </div>
      <nav className="flex gap-2 md:flex-col md:gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
