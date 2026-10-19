// Daily report + low-stock alerts → Telegram.
// Setup: add TELEGRAM_BOT_TOKEN secret, chat IDs live in cafe_settings.telegram_chat_ids.
// Cron: schedule with pg_cron calling this via pg_net, or Supabase Dashboard cron.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("cafe_settings")
      .select("name, telegram_chat_ids")
      .eq("id", 1)
      .maybeSingle();
    const chatIds: string[] = settings?.telegram_chat_ids ?? [];
    if (chatIds.length === 0) {
      return new Response(JSON.stringify({ error: "no telegram chat bound" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // today's completed orders
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { data: orders } = await supabase
      .from("orders")
      .select("total, payment_method, order_items(product_name, quantity)")
      .eq("status", "completed")
      .gte("completed_at", dayStart.toISOString());

    const list = orders ?? [];
    const revenue = list.reduce((s, o) => s + o.total, 0);
    const cash = list.filter((o) => o.payment_method === "cash").reduce((s, o) => s + o.total, 0);
    const transfer = list.filter((o) => o.payment_method !== "cash").reduce((s, o) => s + o.total, 0);
    const count = list.length;
    const avg = count ? Math.round(revenue / count) : 0;

    const productQty = new Map<string, number>();
    for (const o of list)
      for (const i of o.order_items ?? [])
        productQty.set(i.product_name, (productQty.get(i.product_name) ?? 0) + i.quantity);
    const top = [...productQty.entries()].sort((a, b) => b[1] - a[1])[0];

    // low stock
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("name, stock, min_stock, unit")
      .filter("stock", "lte", "min_stock" as never)
      .order("name");
    // fallback filter (lte across columns needs rpc in some versions)
    const low = (ingredients ?? []).length
      ? ingredients!
      : (await supabase.from("ingredients").select("name, stock, min_stock, unit").order("name")).data?.filter(
          (i) => i.stock <= i.min_stock,
        ) ?? [];

    const vi = (n: number) => n.toLocaleString("vi-VN");
    const dateStr = new Date().toLocaleDateString("vi-VN");
    let msg =
      `📊 BÁO CÁO NGÀY ${dateStr} — ${settings?.name ?? "CaPhe POS"}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Doanh thu: ${vi(revenue)}đ\n` +
      `🧾 Số đơn: ${count} (trung bình ${vi(avg)}đ/đơn)\n` +
      (top ? `☕ Món bán chạy: ${top[0]} (${top[1]} ly)\n` : "") +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 Tiền mặt: ${vi(cash)}đ\n` +
      `🏦 Chuyển khoản/thẻ: ${vi(transfer)}đ`;

    if (low.length > 0) {
      msg +=
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ CẢNH BÁO NGUYÊN LIỆU (${low.length}):\n` +
        low.slice(0, 8).map((i) => `• ${i.name}: còn ${vi(i.stock)}${i.unit} (ngưỡng ${vi(i.min_stock)})`).join("\n");
    }

    const results = [];
    for (const chatId of chatIds) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg }),
      });
      results.push({ chatId, ok: res.ok });
    }

    return new Response(JSON.stringify({ sent: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
