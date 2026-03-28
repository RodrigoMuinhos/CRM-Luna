const rawAppMode = String(
  process.env.NEXT_PUBLIC_APP_MODE || process.env.APP_MODE || "kiosk"
)
  .trim()
  .toLowerCase();

export const APP_MODE: "kiosk" | "web-only" =
  rawAppMode === "web" || rawAppMode === "web-only" ? "web-only" : "kiosk";

export const WEB_ONLY_MODE = APP_MODE === "web-only";
