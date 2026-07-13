import fs from "fs";
import path from "path";
import type { ReactNode } from "react";
import sharp from "sharp";
import satori from "satori";

// Serverless runtimes (Vercel/Lambda) ship no system fonts, and even an
// embedded @font-face in a hand-built SVG isn't reliably honored by the
// librsvg build sharp/libvips uses there — it silently falls back to
// missing-glyph boxes. Satori sidesteps this entirely: it converts each
// glyph into an SVG <path> (vector outline) up front, so the SVG handed to
// sharp has no runtime font dependency at all.
const FONT_PATH = path.join(process.cwd(), "lib/ai/fonts/inter-extrabold-latin.woff");
let fontDataCache: Buffer | null = null;

function getFontData(): Buffer {
  if (fontDataCache === null) {
    fontDataCache = fs.readFileSync(FONT_PATH);
  }
  return fontDataCache;
}

function fontSizeFor(text: string): number {
  if (text.length > 90) return 40;
  if (text.length > 60) return 48;
  if (text.length > 40) return 54;
  return 60;
}

async function buildOverlaySvg(text: string, width: number, height: number): Promise<string> {
  const fontSize = fontSizeFor(text);

  const tree = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      },
      children: {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: "88%",
            marginBottom: 48,
            padding: "28px 36px",
            borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.55)",
            color: "#ffffff",
            fontSize,
            fontWeight: 800,
            fontFamily: "Inter",
            textAlign: "center",
            lineHeight: 1.3,
            justifyContent: "center",
          },
          children: text,
        },
      },
    },
  };

  return satori(tree as unknown as ReactNode, {
    width,
    height,
    fonts: [{ name: "Inter", data: getFontData(), weight: 800, style: "normal" }],
  });
}

export async function overlayTextOnImage(base64: string, text: string): Promise<Buffer> {
  const imageBuffer = Buffer.from(base64, "base64");
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const svg = await buildOverlaySvg(text, width, height);

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
