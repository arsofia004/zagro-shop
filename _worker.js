// Cloudflare Pages "advanced mode" worker.
// Serves the static site and handles POST /api/order -> Telegram.
// Secrets (Pages > Settings > Variables and Secrets):
//   BOT_TOKEN - token from @BotFather
//   CHAT_IDS  - comma-separated numeric chat IDs, e.g. "918090196,123456789"

const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

async function order(request, env) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let d;
  try {
    d = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  if (!d.name || (!d.phone && !d.email) || !d.order) {
    return new Response("Missing fields", { status: 400 });
  }

  const text =
    "<b>Новый заказ ZARGO SPORTS</b>\n\n" +
    "Имя: " + esc(d.name).slice(0, 100) + "\n" +
    "Телефон: " + esc(d.phone).slice(0, 50) + "\n" +
    "Почта: " + esc(d.email).slice(0, 100) + "\n" +
    "Получение: " + esc(d.delivery).slice(0, 100) + "\n" +
    "Комментарий: " + esc(d.comment).slice(0, 500) + "\n\n" +
    esc(d.order).slice(0, 2500);

  const ids = (env.CHAT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const results = await Promise.all(
    ids.map((id) =>
      fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id, text, parse_mode: "HTML" }),
      }).then((r) => r.ok, () => false)
    )
  );

  const ok = results.some(Boolean);
  return new Response(ok ? "ok" : "telegram error", { status: ok ? 200 : 502 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/order") return order(request, env);
    return env.ASSETS.fetch(request);
  },
};
