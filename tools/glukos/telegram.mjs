// Skickar text till Marcs Telegram via den gemensamma telegram-lib.js
// (samma token- och chatId-källa som the-work-list/tools/telegram-skicka.js,
// som bara kan skicka bild/fil – här behövs en klickbar länk i text).
// Token läses inuti biblioteket och skrivs aldrig ut här.
import { createRequire } from "node:module";
import path from "node:path";

const LIB = path.join(process.env.USERPROFILE || "C:/Users/PC", ".claude", "hooks", "telegram-lib.js");

function lib() {
  const require = createRequire(import.meta.url);
  return require(LIB);
}

/** HTML-formaterat meddelande utan uppläsningsbubbla. Returnerar true/false, kastar aldrig. */
export async function sendTelegram(html) {
  try {
    const tl = lib();
    const res = await tl.sendMessage(null, html, { rost: false, disable_web_page_preview: true });
    return !!(res && (res.message_id || res.ok !== false));
  } catch (e) {
    const msg = String(e && e.message || e);
    console.error(`Telegram misslyckades: ${msg.replace(/bot\d+:[\w-]+/g, "bot<token>")}`);
    return false;
  }
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
