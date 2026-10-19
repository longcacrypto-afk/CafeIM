import { useEffect, useMemo, useState } from 'react'
import { Coffee, CupSoda, Plus, Minus, Check, X, ChevronUp, ChevronDown, Loader2, CheckCircle2, Armchair } from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import { fetchPublicMenu, submitCustomerOrder } from '../lib/api'
import type { Category, Product, ProductSize, Topping } from '../lib/api'

interface Line {
  id: string
  product: Product
  size: 'S' | 'M' | 'L'
  sizePrice: number
  quantity: number
  note?: string
  toppings: { name: string; price: number }[]
}

interface Pick {
  product: Product
  size: 'S' | 'M' | 'L'
  toppings: { name: string; price: number }[]
  note: string
}

let nextId = 1

export default function CustomerMenu() {
  const { lang } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [toppings, setToppings] = useState<Topping[]>([])
  const [category, setCategory] = useState('all')
  const [lines, setLines] = useState<Line[]>([])
  const [pick, setPick] = useState<Pick | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const tableName = useMemo(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get('ban') ?? p.get('table') ?? ''
  }, [])

  useEffect(() => {
    fetchPublicMenu()
      .then((m) => {
        setCategories(m.categories)
        setProducts(m.products)
        setSizes(m.sizes)
        setToppings(m.toppings)
      })
      .catch(() =>
        setError(
          lang === 'vi'
            ? 'Không tải được menu. Vui lòng tải lại trang.'
            : 'Could not load the menu. Please reload.',
        ),
      )
      .finally(() => setLoading(false))
  }, [lang])

  const sizePrice = (p: Product, s: 'S' | 'M' | 'L') =>
    sizes.find((ps) => ps.product_id === p.id && ps.size === s)?.price ?? p.price

  const visible = products.filter(
    (p) => !p.sold_out && (category === 'all' || categories.find((c) => c.id === p.category_id)?.name === category),
  )

  const lineTotal = (l: Line) => (l.sizePrice + l.toppings.reduce((s, tp) => s + tp.price, 0)) * l.quantity
  const total = lines.reduce((s, l) => s + lineTotal(l), 0)
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0)

  const addLine = (p: Product, size: 'S' | 'M' | 'L', tops: { name: string; price: number }[], note: string) => {
    const price = sizePrice(p, size)
    setLines((ls) => {
      const key = (l: Line) => `${l.product.id}|${l.size}|${l.toppings.map((x) => x.name).sort().join(',')}`
      const existing = ls.find(
        (l) => key(l) === `${p.id}|${size}|${tops.map((x) => x.name).sort().join(',')}` && !l.note,
      )
      if (existing && !note) return ls.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l))
      return [...ls, { id: `c${nextId++}`, product: p, size, sizePrice: price, quantity: 1, note: note || undefined, toppings: tops }]
    })
    setPick(null)
  }

  const send = async () => {
    if (lines.length === 0 || !tableName) return
    setSending(true)
    setError(null)
    try {
      await submitCustomerOrder({
        table_name: tableName,
        total,
        items: lines.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.name,
          size: l.size,
          size_price: l.sizePrice,
          unit_price: l.sizePrice + l.toppings.reduce((s, tp) => s + tp.price, 0),
          quantity: l.quantity,
          note: l.note ?? null,
          toppings: l.toppings,
        })),
      })
      setLines([])
      setCartOpen(false)
      setSent(true)
      setTimeout(() => setSent(false), 6000)
    } catch {
      setError(lang === 'vi' ? 'Không gửi được đơn. Vui lòng thử lại.' : 'Could not submit. Please retry.')
    } finally {
      setSending(false)
    }
  }

  const vi = (s: string, en: string) => (lang === 'vi' ? s : en)

  return (
    <div className="flex min-h-full flex-col bg-[#faf7f2]">
      {/* header */}
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-800 text-amber-50">
            <Coffee size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink">{vi('Gọi món', 'Order here')}</p>
            {tableName ? (
              <p className="flex items-center gap-1 text-[11px] text-stone-400">
                <Armchair size={11} /> {tableName}
              </p>
            ) : (
              <p className="text-[11px] text-warn">{vi('Quét mã QR trên bàn để gọi món', 'Scan the table QR to order')}</p>
            )}
          </div>
          {totalQty > 0 && (
            <span className="rounded-full bg-brand-800 px-3 py-1 text-[12px] font-bold text-amber-50">
              {totalQty} · {formatMoney(total, lang)}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {sent && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-ready">
          <CheckCircle2 size={16} />
          {vi('Đã gửi đơn về quầy! Nhân viên sẽ xác nhận ngay.', 'Order sent! Staff will confirm shortly.')}
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24 text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <main className="min-h-0 flex-1 p-4">
          {/* category chips */}
          <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1">
            {['all', ...categories.map((c) => c.name)].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  category === c ? 'bg-ink text-amber-50' : 'bg-white text-stone-500 shadow-sm'
                }`}
              >
                {c === 'all' ? vi('Tất cả', 'All') : c}
              </button>
            ))}
          </div>

          {/* products */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => setPick({ product: p, size: 'M', toppings: [], note: '' })}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/70 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex h-20 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100/60">
                  <Coffee className="text-brand-300 transition-transform group-hover:scale-110" size={26} strokeWidth={1.8} />
                </div>
                <div className="px-3 pb-3 pt-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 text-[13px] font-bold tabular-nums text-brand-700">{formatMoney(p.price, lang)}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* sticky cart bar */}
      {lines.length > 0 && (
        <div className="sticky bottom-0 border-t border-stone-200/70 bg-white/95 px-4 py-3 backdrop-blur">
          {cartOpen && (
            <ul className="mb-3 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {lines.map((l) => (
                <li key={l.id} className="rounded-xl bg-stone-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] font-semibold text-ink">
                      {l.product.name} · {l.size} ×{l.quantity}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <p className="text-[12px] font-bold tabular-nums text-ink">{formatMoney(lineTotal(l), lang)}</p>
                      <button
                        onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                        className="rounded-md p-1 text-stone-300 transition-colors hover:text-danger"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  {(l.note || l.toppings.length > 0) && (
                    <p className="mt-0.5 truncate text-[11px] italic text-warn">
                      {l.toppings.length > 0 && `${l.toppings.map((tp) => tp.name).join(', ')} · `}
                      {l.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="flex shrink-0 items-center justify-center rounded-xl border border-stone-200 px-3.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50"
            >
              {cartOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              onClick={send}
              disabled={sending || !tableName}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 py-3.5 text-sm font-semibold text-amber-50 shadow-lg transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {vi(`Gửi đơn · ${formatMoney(total, lang)}`, `Send order · ${formatMoney(total, lang)}`)}
            </button>
          </div>
        </div>
      )}

      {/* pick modal */}
      {pick && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setPick(null)} />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{pick.product.name}</h3>
              <button onClick={() => setPick(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>

            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-stone-600">
              <CupSoda size={14} /> {vi('Chọn size', 'Size')}
            </p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(['S', 'M', 'L'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPick((pk) => (pk ? { ...pk, size: s } : pk))}
                  className={`flex flex-col items-center rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                    pick.size === s ? 'border-brand-700 bg-brand-800 text-amber-50' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  {s}
                  <span className={`text-[11px] font-normal tabular-nums ${pick.size === s ? 'text-amber-100/80' : 'text-stone-400'}`}>
                    {formatMoney(sizePrice(pick.product, s), lang)}
                  </span>
                </button>
              ))}
            </div>

            {toppings.length > 0 && (
              <>
                <p className="mb-2 text-[13px] font-semibold text-stone-600">{vi('Topping thêm', 'Toppings')}</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {toppings.map((tp) => {
                    const on = pick.toppings.some((x) => x.name === tp.name)
                    return (
                      <button
                        key={tp.id}
                        onClick={() =>
                          setPick((pk) =>
                            pk
                              ? {
                                  ...pk,
                                  toppings: on ? pk.toppings.filter((x) => x.name !== tp.name) : [...pk.toppings, { name: tp.name, price: tp.price }],
                                }
                              : pk,
                          )
                        }
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                          on ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        {tp.name}
                        <span className="tabular-nums text-[11px] text-stone-400">+{formatMoney(tp.price, lang)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-stone-600">
                {vi('Ghi chú cho món này', 'Note for this item')}
              </span>
              <input
                value={pick.note}
                onChange={(e) => setPick((pk) => (pk ? { ...pk, note: e.target.value } : pk))}
                placeholder={vi('VD: ít đá, thêm sữa...', 'e.g. less ice, extra milk...')}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white"
              />
            </label>

            <button
              onClick={() => addLine(pick.product, pick.size, pick.toppings, pick.note)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99]"
            >
              <Plus size={15} strokeWidth={2.5} /> {vi('Thêm vào đơn', 'Add to order')} ·{' '}
              {formatMoney(sizePrice(pick.product, pick.size) + pick.toppings.reduce((s, tp) => s + tp.price, 0), lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
