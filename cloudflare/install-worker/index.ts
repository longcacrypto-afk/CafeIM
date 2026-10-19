/*
Cloudflare Worker: auto-install link generator.

What it does
- The POS app is published once (e.g. at app.yourdomain.com).
- Each cafe gets a subdomain like coffea.yourdomain.com served by THIS worker.
- GET / (no query): landing page explaining the setup.
- GET /admin: interactive form. Choose a profile (mini / standard / full) + subdomain +
  Supabase project URL + anon key -> the worker stores the config in KV and returns
  the ready install link https://<subdomain>.<host>/.
- GET / (visitor): reads the Host header -> KV lookup -> serves the POS index.html with
  the cafe's env injected as window.__CAFE_ENV__ (supabase URL + anon key).
- GET /api/config (POST, secret): used by the POS "install" UI to create the KV entry
  programmatically.

Cloudflare free tier: KV free tier is plenty (reads: 100k/day, writes: 1k/day).

Deploy (one time, from your machine with wrangler):
  npm install -g wrangler
  wrangler login
  cd cloudflare/install-worker
  wrangler kv namespace create CAFE_CONFIG
  # paste the returned id into wrangler.toml
  wrangler deploy

Then in Cloudflare dashboard, add a subdomain wildcard route:
  Route: *.yourdomain.com -> this worker
  (Free plan supports custom domain routes for workers; register a wildcard DNS record
  pointing at the worker via a Workers Custom Domain on the apex, or use the
  workers.dev preview for testing.)
*/

export interface Env {
  CAFE_CONFIG: KVNamespace
  ADMIN_SECRET?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const htmlHead = (title: string, body: string) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{font-family:ui-sans-serif,system-ui;max-width:640px;margin:0 auto;padding:24px;color:#1c1917;background:#faf9f7;line-height:1.5}
  h1{font-size:20px}h2{font-size:16px;margin-top:28px}
  label{display:block;margin:14px 0 4px;font-size:13px;font-weight:600;color:#57534e}
  input,select{width:100%;padding:10px;border:1px solid #d6d3d1;border-radius:10px;font-size:14px;box-sizing:border-box}
  button{margin-top:20px;padding:12px 20px;background:#5d4037;color:#fef3c7;border:0;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}
  .ok{margin-top:16px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;font-size:14px;word-break:break-all}
  .err{margin-top:16px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;font-size:14px;color:#b91c1c}
  .desc{font-size:13px;color:#78716c;margin:4px 0 0}
</style></head><body>${body}</body></html>`

interface CafeKV {
  supabaseUrl: string
  supabaseAnonKey: string
  profile: string
  cafeName: string
  createdAt: string
}

function parseHost(request: Request): string {
  const host = request.headers.get('host') || new URL(request.url).hostname
  return host.toLowerCase()
}

function isWild(request: Request): string | null {
  const h = parseHost(request)
  const apex = (new URL(request.url).hostname || '').toLowerCase()
  // e.g. request.url is https://coffea.yourdomain.com/ -> hostname coffea.yourdomain.com
  // apex config is on env (route). We treat the LAST TWO LABELS as apex unless the host
  // matches workers.dev preview (then apex is the full host and there is no wildcard).
  if (h.endsWith('workers.dev')) return null
  const labels = h.split('.')
  if (labels.length <= 2) return null
  return labels.slice(0, -2).join('.')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function adminPage(): Response {
  const body = `<h1>CaPhe POS — Trình cài đặt tự động</h1>
<p class="desc">Chọn gói module, đặt subdomain và điền thông tin Supabase của quán. Hệ thống sẽ sinh link install sẵn dùng.</p>
<h2>1. Thông tin quán</h2>
<label>Tên quán</label><input id="cafeName" placeholder="VD: Coffee A">
<label>Subdomain</label><input id="subdomain" placeholder="VD: coffea">
<p class="desc">Link install sẽ là https://<span id="hostHint">subdomain</span>.<b>${'yourdomain'}.com</b>/</p>
<h2>2. Chọn gói module</h2>
<select id="profile">
  <option value="small">Mini — 1 tài khoản order + doanh thu + báo cáo</option>
  <option value="standard" selected>Tiêu chuẩn — thêm pha chế, QR, menu</option>
  <option value="full">Đầy đủ — tất cả module nâng cao</option>
</select>
<h2>3. Supabase project</h2>
<label>Project URL</label><input id="supabaseUrl" placeholder="https://xxxx.supabase.co">
<label>Anon key</label><input id="supabaseAnonKey" placeholder="eyJhbGciOi...">
<button onclick="save()">Sinh link install</button>
<div id="result"></div>
<script>
const apexHost = location.hostname === 'localhost' ? 'yourdomain.com' : location.hostname.replace(/^[^.]+\\./, '')
document.getElementById('hostHint').textContent = document.getElementById('subdomain').value || 'subdomain'
document.getElementById('subdomain').addEventListener('input', (e) => {
  document.getElementById('hostHint').textContent = e.target.value || 'subdomain'
})
async function save() {
  const body = {
    cafeName: document.getElementById('cafeName').value,
    subdomain: document.getElementById('subdomain').value.toLowerCase().trim(),
    profile: document.getElementById('profile').value,
    supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
    supabaseAnonKey: document.getElementById('supabaseAnonKey').value.trim(),
  }
  if (!body.subdomain || !body.supabaseUrl || !body.supabaseAnonKey || !body.cafeName) {
    document.getElementById('result').innerHTML = '<div class="err">Điền đủ tên quán, subdomain, URL và anon key.</div>'
    return
  }
  const r = await fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
  const d = await r.json()
  if (!r.ok) { document.getElementById('result').innerHTML = '<div class="err">' + (d.error || 'Lỗi') + '</div>'; return }
  document.getElementById('result').innerHTML = '<div class="ok">Link install: <b><a href="' + d.installUrl + '">' + d.installUrl + '</a></b><br>Mở link này trên tablet/điện thoại quầy và chọn "Add to Home Screen" để dùng như PWA.</div>'
}
</script>`
  return new Response(htmlHead('CaPhe POS — Auto install', body), { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}

function landingPage(host: string): Response {
  const body = `<h1>CaPhe POS</h1>
<p>Quán của bạn chưa được cấu hình trên subdomain <b>${host}</b>.</p>
<p>Mở <b>https://${host}/admin</b> để sinh link install tự động cho quán.</p>`
  return new Response(htmlHead('CaPhe POS', body), { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}

async function serveApp(request: Request, env: Env, apex: string): Promise<Response> {
  const cfg = await env.CAFE_CONFIG.get<CafeKV>(apex, 'json')
  if (!cfg) return landingPage(parseHost(request))
  const indexUrl = (await env.CAFE_CONFIG.get('APP_INDEX_URL')) || 'https://app.yourdomain.com/index.html'
  const r = await fetch(indexUrl)
  const html = await r.text()
  const inject = `<script>window.__CAFE_ENV__=${JSON.stringify({
    supabaseUrl: cfg.supabaseUrl,
    supabaseAnonKey: cfg.supabaseAnonKey,
    cafeName: cfg.cafeName,
    profile: cfg.profile,
  })};</script>`
  const out = html.replace('</head>', inject + '</head>')
  return new Response(out, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors })
    const url = new URL(request.url)
    const host = parseHost(request)

    try {
      if (url.pathname === '/admin') return adminPage()

      if (url.pathname === '/api/config' && request.method === 'POST') {
        const body = await request.json<Partial<CafeKV> & { subdomain?: string }>()
        const subdomain = body.subdomain?.toLowerCase().trim()
        if (!subdomain || !subdomain.match(/^[a-z0-9][a-z0-9-]{0,30}$/)) return json({ error: 'Subdomain không hợp lệ' }, 400)
        if (!body.supabaseUrl || !body.supabaseAnonKey) return json({ error: 'Thiếu Supabase URL / anon key' }, 400)
        const apex = host.endsWith('workers.dev') ? `${subdomain}.yourdomain.com` : `${subdomain}.${host.replace(/^[^.]+\\./, '')}`
        const kv: CafeKV = {
          supabaseUrl: body.supabaseUrl,
          supabaseAnonKey: body.supabaseAnonKey,
          profile: body.profile || 'standard',
          cafeName: body.cafeName || subdomain,
          createdAt: new Date().toISOString(),
        }
        await env.CAFE_CONFIG.put(apex, JSON.stringify(kv))
        const installUrl = `https://${apex}/`
        return json({ ok: true, apex, installUrl })
      }

      // app serving: whatever subdomain the visitor used, look it up in KV
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const apex = isWild(request) ?? 'yourdomain.com'
        return serveApp(request, env, apex)
      }

      return new Response('Not found', { status: 404 })
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Worker error' }, 500)
    }
  },
}
