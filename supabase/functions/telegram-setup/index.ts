// One-time bot setup: Telegram calls this webhook when the owner presses
// "Start" on the bot — it records the chat_id into cafe_settings.
// Setup flow:
//   1. Create bot via @BotFather → TELEGRAM_BOT_TOKEN secret
//   2. Set Telegram webhook: https://<project>.supabase.co/functions/v1/telegram-setup
//   3. Owner sends /start to the bot → chat_id saved → daily reports arrive.

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
    const update = await req.json();
    const chatId: string | undefined = update?.message?.chat?.id != null
      ? String(update.message.chat.id)
      : undefined;
    if (!chatId) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("cafe_settings")
      .select("telegram_chat_ids")
      .eq("id", 1)
      .maybeSingle();
    const ids: string[] = settings?.telegram_chat_ids ?? [];
    if (!ids.includes(chatId)) {
      await supabase
        .from("cafe_settings")
        .update({ telegram_chat_ids: [...ids, chatId] })
        .eq("id", 1);
    }

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Đã kết nối với CaPhe POS! Bạn sẽ nhận báo cáo cuối ngày và cảnh báo nguyên liệu tại đây.",
        }),
      });
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
