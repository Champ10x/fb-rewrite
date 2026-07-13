import fs from "fs";
import path from "path";
import sharp from "sharp";

// Serverless runtimes (Vercel/Lambda) ship no system fonts, so an SVG
// <text> with only a font-family name rasterizes as empty glyph boxes.
// Embedding the font's bytes directly in the SVG via @font-face sidesteps
// that regardless of what fonts (if any) are installed on the host.
const FONT_PATH = path.join(process.cwd(), "lib/ai/fonts/inter-extrabold-latin.woff");
const FONT_FAMILY = "OverlayFont";
let fontBase64Cache: string | null = null;

function getFontBase64(): string {
  if (fontBase64Cache === null) {
    fontBase64Cache = fs.readFileSync(FONT_PATH).toString("base64");
  }
  return fontBase64Cache;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  return lines;
}

function buildOverlaySvg(text: string, width: number, height: number): string {
  let fontSize = 58;
  if (text.length > 90) fontSize = 38;
  else if (text.length > 60) fontSize = 46;
  else if (text.length > 40) fontSize = 52;

  const maxCharsPerLine = Math.max(10, Math.floor((width * 0.82) / (fontSize * 0.56)));
  const lines = wrapLines(text, maxCharsPerLine, 6);
  const lineHeight = fontSize * 1.25;
  const padding = 40;
  const blockHeight = lines.length * lineHeight + padding * 2;
  const blockWidth = width * 0.9;
  const blockX = (width - blockWidth) / 2;
  const blockY = height - blockHeight - 48;

  const textLines = lines
    .map((line, i) => {
      const y = blockY + padding + fontSize * 0.85 + i * lineHeight;
      return `<text x="${width / 2}" y="${y}" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" stroke="#000000" stroke-width="${(fontSize * 0.05).toFixed(1)}" paint-order="stroke" stroke-linejoin="round">${escapeXml(line)}</text>`;
    })
    .join("");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face {
          font-family: '${FONT_FAMILY}';
          font-weight: 800;
          src: url(data:font/woff;base64,${getFontBase64()}) format('woff');
        }
      </style>
    </defs>
    <rect x="${blockX}" y="${blockY}" width="${blockWidth}" height="${blockHeight}" rx="18" fill="#000000" fill-opacity="0.55" />
    ${textLines}
  </svg>`;
}

export async function overlayTextOnImage(base64: string, text: string): Promise<Buffer> {
  const imageBuffer = Buffer.from(base64, "base64");
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const svg = buildOverlaySvg(text, width, height);

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
