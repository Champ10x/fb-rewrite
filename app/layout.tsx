import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fb-rewrite",
  description: "AI-powered Facebook post rewriter for lead generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
