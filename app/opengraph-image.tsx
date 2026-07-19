import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "fbrewrite — lead-gen post rewrites in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F1E3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#E8B94A",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 72,
                height: 56,
                borderRadius: 16,
                backgroundColor: "#FFF7E6",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: "#C97B4A" }}>fb</span>
            <span style={{ color: "#1c1917" }}>rewrite</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#57534e" }}>
          Lead-gen post rewrites, scored and ready to post
        </div>
      </div>
    ),
    { ...size },
  );
}
