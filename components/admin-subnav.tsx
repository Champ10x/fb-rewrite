"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Users & Activity" },
  { href: "/admin/usage-log", label: "Usage Log" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/access", label: "Access" },
];

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex gap-1 border-b border-neutral-200 pb-px">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
