import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fb-rewrite.vercel.app"),
  title: "fb-rewrite",
  description: "AI-powered Facebook post rewriter for lead generation.",
  openGraph: {
    title: "fbrewrite",
    description: "Lead-gen post rewrites, scored and ready to post.",
    url: "https://fb-rewrite.vercel.app",
    siteName: "fbrewrite",
  },
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
