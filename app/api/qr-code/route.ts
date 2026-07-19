import { NextResponse } from "next/server";
import QRCode from "qrcode";

const APP_URL = "https://fb-rewrite.vercel.app";

export async function GET() {
  const buffer = await QRCode.toBuffer(APP_URL, {
    type: "png",
    width: 240,
    margin: 1,
    color: { dark: "#1c1917", light: "#ffffffff" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
