import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Minus, Trash2, Receipt, Printer, Armchair, Coffee, CupSoda,
  Check, X, Banknote, Smartphone, CreditCard, Send, ShoppingBag, StickyNote, Loader2, Ban,
  ArrowRightLeft, Clock3, History, User, Scissors,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import { supabase } from '../lib/supabase'
import {
  fetchCategories, fetchProducts, fetchProductSizes, fetchToppings, fetchTables,
  fetchOpenOrders, fetchTodayCompletedOrders, createOrder, moveOrder, moveOrderItem, confirmQrOrder,
  payOrder, addItemsToOrder,
} from '../lib/api'
import type { Category, Product, ProductSize, Topping, CafeTable, Order, OrderItemRow, DiscountType } from '../lib/api'

interface ToppingPick {
  name: string
  price: number
}

interface Draft {
  id: string
  product: Product
  size: 'S' | 'M' | 'L'
  sizePrice: number
  quantity: number
  note?: string
  toppings: ToppingPick[]
}

interface CustomizeState {
  product: Product
  size: 'S' | 'M' | 'L'
  toppings: ToppingPick[]
  note: string
}

export interface ReceiptData {
  id: string
  tableName: string
  items: { name: string; size: string; qty: number; price: number; toppings: ToppingPick[]; note?: string | null }[]
  subtotal: number
  discountAmount: number
  discountLabel: string | null
  total: number
  paymentMethod: string | null
  cashier: string
  customerPaid?: number | null
  changeDue?: number | null
}

let nextId = 1

export default function PosScreen({ cashierName, onPrintReceipt }: {
  cashierName: string
  onPrintReceipt: (r: ReceiptData) => void
}) {
  const { t, lang } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [toppings, setToppings] = useState<Topping[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [tableId, setTableId] = useState<string | null>(null)
  const [area, setArea] = useState<string>('all')
  const [draft, setDraft] = useState<Draft[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [itemNoteFor, setItemNoteFor] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [customize, setCustomize] = useState<CustomizeState | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [openOrders, setOpenOrders] = useState<(Order & { order_items: OrderItemRow[] })[]>([])
  const [moveOrderId, setMoveOrderId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveTab, setMoveTab] = useState<'table' | 'split'>('table')
  const [splitSourceId, setSplitSourceId] = useState<string | null>(null)
  const [splitItemId, setSplitItemId] = useState<string | null>(null)
  const [splitTargetId, setSplitTargetId] = useState<string | null>(null)
  const [splitting, setSplitting] = useState(false)
  const [qrOrders, setQrOrders] = useState<(Order & { order_items: OrderItemRow[] })[]>([])
  const [unpaid, setUnpaid] = useState<(Order & { order_items: OrderItemRow[] })[]>([])
  const [todayDone, setTodayDone] = useState<(Order & { order_items: OrderItemRow[] })[]>([])
  const [sideTab, setSideTab] = useState<'unpaid' | 'history'>('unpaid')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountInput, setDiscountInput] = useState('')
  const [paidInput, setPaidInput] = useState('')
  const [changeShown, setChangeShown] = useState<number | null>(null)

  const refreshOrderLists = async () => {
    try {
      const [open, done] = await Promise.all([fetchOpenOrders(), fetchTodayCompletedOrders()])
      setUnpaid(open)
      setQrOrders(open.filter((o) => o.source === 'qr' && !o.customer_status))
      setTodayDone(done)
    } catch {
      /* keep previous */
    }
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const all = await fetchOpenOrders()
        if (!alive) return
        setUnpaid(all)
        setQrOrders(all.filter((o) => o.source === 'qr' && !o.customer_status))
      } catch {
        /* background poll */
      }
    }
    load()
    fetchTodayCompletedOrders().then((d) => alive && setTodayDone(d)).catch(() => {})
    const iv = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProducts(), fetchProductSizes(), fetchToppings(), fetchTables()])
      .then(([cats, prods, szs, tops, tbls]) => {
        setCategories(cats)
        setProducts(prods)
        setSizes(szs)
        setToppings(tops)
        setTables(tbls)
      })
      .catch(() => setError(lang === 'vi' ? 'Không tải được dữ liệu. Vui lòng thử lại.' : 'Failed to load data. Please retry.'))
      .finally(() => setLoading(false))
  }, [lang])

  const table = tables.find((tb) => tb.id === tableId)
  const areas = useMemo(() => [...new Set(tables.map((tb) => tb.area))], [tables])
  const filteredTables = area === 'all' ? tables : tables.filter((tb) => tb.area === area)

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? ''
  const visibleCategories = ['all', ...categories.map((c) => c.name)]

  const products_filtered = useMemo(
    () =>
      products.filter((p) => {
        const inCat = category === 'all' || categoryName(p.category_id) === category
        return inCat && p.name.toLowerCase().includes(search.toLowerCase())
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, category, search, categories],
  )

  const sizePrice = (p: Product, s: 'S' | 'M' | 'L') =>
    sizes.find((ps) => ps.product_id === p.id && ps.size === s)?.price ?? p.price

  const itemTotal = (i: Draft) => (i.sizePrice + i.toppings.reduce((s, tp) => s + tp.price, 0)) * i.quantity

  const openCustomize = (p: Product) => {
    if (sizes.some((ps) => ps.product_id === p.id)) {
      setCustomize({ product: p, size: 'M', toppings: [], note: '' })
    } else {
      addItem(p, 'M', p.price, [])
    }
  }

  const addItem = (p: Product, size: 'S' | 'M' | 'L', price: number, tops: ToppingPick[], note?: string) => {
    setDraft((d) => {
      const key = (i: Draft) => `${i.product.id}|${i.size}|${i.toppings.map((x) => x.name).sort().join(',')}`
      const existing = d.find(
        (i) => key(i) === `${p.id}|${size}|${tops.map((x) => x.name).sort().join(',')}` && !i.note,
      )
      if (existing)
        return d.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [...d, { id: `d${nextId++}`, product: p, size, sizePrice: price, quantity: 1, note: note || undefined, toppings: tops }]
    })
  }

  const setQuantity = (id: string, delta: number) =>
    setDraft((d) =>
      d.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)),
    )

  const removeItem = (id: string) => setDraft((d) => d.filter((i) => i.id !== id))

  const total = draft.reduce((s, i) => s + itemTotal(i), 0)
  const totalQty = draft.reduce((s, i) => s + i.quantity, 0)

  const discountValueNum = Number(discountInput.replace(/\D/g, '')) || 0
  const discountAmount =
    discountType === 'amount' ? Math.min(discountValueNum, total) :
    discountType === 'percent' ? Math.round((total * Math.min(discountValueNum, 100)) / 100) :
    0
  const finalTotal = Math.max(0, total - discountAmount)
  const paidNum = Number(paidInput.replace(/\D/g, '')) || 0
  const changeDue = paidNum > 0 ? paidNum - finalTotal : null
  const discountLabel =
    discountType === 'amount' ? `${t('discountAmount')}: ${formatMoney(discountAmount, lang)}` :
    discountType === 'percent' ? `${t('discountPercent')}: ${discountValueNum}% (-${formatMoney(discountAmount, lang)})` :
    null

  const submitOrder = async (paymentMethod: string | null) => {
    if (draft.length === 0) return
    setSending(true)
    try {
      let order: Order
      if (activeOrderId) {
        // append to existing open order; total recomputed server-side
        await addItemsToOrder(
          activeOrderId,
          draft.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            size: i.size,
            size_price: i.sizePrice,
            unit_price: i.sizePrice + i.toppings.reduce((s, tp) => s + tp.price, 0),
            quantity: i.quantity,
            note: i.note ?? null,
            toppings: i.toppings,
          })),
        )
        const updated = unpaid.find((o) => o.id === activeOrderId)
        order = ({ ...updated, total: (updated?.total ?? 0) + total }) as Order
      } else {
        order = await createOrder({
          table_name: table?.name ?? t('takeaway'),
          total: finalTotal,
          payment_method: paymentMethod,
          note: null,
          discount_type: discountType,
          discount_value: discountValueNum,
          discount_amount: discountAmount,
          items: draft.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            size: i.size,
            size_price: i.sizePrice,
            unit_price: i.sizePrice + i.toppings.reduce((s, tp) => s + tp.price, 0),
            quantity: i.quantity,
            note: i.note ?? null,
            toppings: i.toppings,
          })),
        })
      }
      if (paymentMethod) {
        if (activeOrderId) {
          const paid = await payOrder(activeOrderId, paymentMethod, { type: discountType, value: discountValueNum, amount: discountAmount })
          onPrintReceipt({
            id: paid.id.slice(0, 8).toUpperCase(),
            tableName: paid.table_name ?? t('takeaway'),
            items: (paid as unknown as { order_items: OrderItemRow[] }).order_items?.map((i) => ({
              name: i.product_name, size: i.size, qty: i.quantity, price: i.unit_price,
              toppings: (i.toppings ?? []) as ToppingPick[],
              note: i.note,
            })) ?? [],
            subtotal: total,
            discountAmount,
            discountLabel,
            total: paid.total,
            paymentMethod,
            cashier: cashierName,
            customerPaid: paymentMethod === 'cash' && paidNum > 0 ? paidNum : null,
            changeDue: paymentMethod === 'cash' && paidNum > 0 ? paidNum - finalTotal : null,
          })
        } else {
          onPrintReceipt({
            id: order.id.slice(0, 8).toUpperCase(),
            tableName: table?.name ?? t('takeaway'),
            items: draft.map((i) => ({
              name: i.product.name, size: i.size, qty: i.quantity,
              price: i.sizePrice + i.toppings.reduce((s, tp) => s + tp.price, 0),
              toppings: i.toppings,
              note: i.note ?? null,
            })),
            subtotal: total,
            discountAmount,
            discountLabel,
            total: finalTotal,
            paymentMethod,
            cashier: cashierName,
            customerPaid: paymentMethod === 'cash' && paidNum > 0 ? paidNum : null,
            changeDue: paymentMethod === 'cash' && paidNum > 0 ? paidNum - finalTotal : null,
          })
        }
      }
      setPayOpen(false)
      setDraft([])
      setActiveOrderId(null)
      setDiscountType('none')
      setDiscountInput('')
      setPaidInput('')
      setChangeShown(null)
      setCartOpen(false)
      refreshOrderLists()
    } catch {
      setError(lang === 'vi' ? 'Không gửi được đơn. Vui lòng thử lại.' : 'Could not submit order. Please retry.')
    } finally {
      setSending(false)
    }
  }

  const openMove = async () => {
    setMoveOpen(true)
    try {
      setOpenOrders(await fetchOpenOrders())
    } catch {
      /* modal shows empty */
    }
  }

  const doMove = async () => {
    if (!moveOrderId || !moveTarget) return
    setMoving(true)
    setError(null)
    try {
      await moveOrder(moveOrderId, moveTarget)
      setMoveOpen(false)
      setMoveOrderId(null)
      setMoveTarget(null)
    } catch {
      setError(lang === 'vi' ? 'Không chuyển được bàn.' : 'Could not move the order.')
    } finally {
      setMoving(false)
    }
  }

  const doSplitItem = async () => {
    if (!splitItemId || !splitTargetId) return
    setSplitting(true)
    setError(null)
    try {
      await moveOrderItem(splitItemId, splitTargetId)
      setMoveOpen(false)
      setSplitSourceId(null)
      setSplitItemId(null)
      setSplitTargetId(null)
      refreshOrderLists()
    } catch {
      setError(lang === 'vi' ? 'Không chuyển được món.' : 'Could not move the item.')
    } finally {
      setSplitting(false)
    }
  }

  const cartPanelHeader = () => (
    <div className="flex items-center justify-between border-b border-stone-100 px-5 pb-3.5 pt-4">
      <div>
        <h2 className="text-[15px] font-bold text-ink">
          {activeOrderId ? t('reopenOrder') : t('currentOrder')}
        </h2>
        <p className="mt-0.5 text-xs text-stone-400">
          {table ? `${table.name} · ${table.area}` : t('noTable')}
          {activeOrderId && ` · ${t('appendingHint')}`}
        </p>
      </div>
      {draft.length > 0 && (
        <button
          onClick={() => {
            setDraft([])
            setActiveOrderId(null)
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-danger/80 hover:bg-red-50"
        >
          <Trash2 size={13} /> {t('clearOrder')}
        </button>
      )}
      <button
        onClick={() => setCartOpen(false)}
        className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink lg:hidden"
        title={t('closeReceipt')}
      >
        <X size={17} />
      </button>
    </div>
  )

  const cartPanel = (
    <div className="flex h-full flex-col bg-white">
      {cartPanelHeader()}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {draft.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 text-stone-300">
            <Receipt size={40} strokeWidth={1.5} />
            <p className="text-[13px] text-stone-400">{t('emptyCart')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {draft.map((i) => (
              <li key={i.id} className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-3 transition-colors hover:bg-stone-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{i.product.name}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t('size')} {i.size}
                      {i.toppings.length > 0 && ` · ${i.toppings.map((tp) => tp.name).join(', ')}`}
                    </p>
                    {i.note && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] italic text-warn">
                        <StickyNote size={10} /> {i.note}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-[13px] font-semibold text-ink">
                    {formatMoney(itemTotal(i), lang)}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQuantity(i.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-[13px] font-bold tabular-nums">{i.quantity}</span>
                    <button
                      onClick={() => setQuantity(i.id, +1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setItemNoteFor(itemNoteFor === i.id ? null : i.id)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        i.note || itemNoteFor === i.id
                          ? 'bg-amber-50 text-warn'
                          : 'text-stone-300 hover:bg-brand-50 hover:text-brand-700'
                      }`}
                      title={t('note')}
                    >
                      <StickyNote size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt(t('cancelReason'))
                        if (reason && reason.trim()) {
                          removeItem(i.id)
                          window.dispatchEvent(new CustomEvent('pos-request-cancel', { detail: { name: i.product.name, reason: reason.trim() } }))
                        }
                      }}
                      className="rounded-lg p-1.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-danger"
                      title={t('cancelItem')}
                    >
                      <Ban size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(i.id)}
                      className="rounded-lg p-1.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {itemNoteFor === i.id && (
                  <input
                    autoFocus
                    placeholder={t('notePlaceholder')}
                    className="mt-2 w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-500/15"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value.trim()
                        setDraft((d) =>
                          d.map((x) => (x.id === i.id ? { ...x, note: v || undefined } : x)),
                        )
                        setItemNoteFor(null)
                      }
                      if (e.key === 'Escape') setItemNoteFor(null)
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-stone-100 p-4">
        <div className="mb-1 flex items-center justify-between text-[13px] text-stone-500">
          <span>
            {t('subtotal')} ({totalQty} {t('items')})
          </span>
          <span className="text-[17px] font-bold tabular-nums text-ink">{formatMoney(total, lang)}</span>
        </div>
        <button
          onClick={openMove}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <ArrowRightLeft size={13} /> {t('mergeTable')}
        </button>
        <button
          disabled={draft.length === 0}
          onClick={() => setPayOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:active:scale-100"
        >
          <Send size={16} /> {t('sendAndPay')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
        )}
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-stone-400">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : (
          <>
            {/* QR orders waiting for confirmation */}
            {qrOrders.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-warn">
                  <Smartphone size={15} /> {t('newQrOrder')} ({qrOrders.length})
                </p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {qrOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                          <Armchair size={13} className="text-brand-600" /> {o.table_name}
                          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                            {t('qrOrderBadge')}
                          </span>
                        </p>
                        <p className="max-w-[280px] truncate text-[11px] text-stone-400">
                          {o.order_items.map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await confirmQrOrder(o.id)
                            setQrOrders((qs) => qs.filter((x) => x.id !== o.id))
                          } catch {
                            setError(lang === 'vi' ? 'Không xác nhận được đơn.' : 'Could not confirm.')
                          }
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-ready px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:brightness-110"
                      >
                        <Check size={12} strokeWidth={3} /> {t('confirmQr')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tables — horizontal scroll strip */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h1 className="text-[15px] font-bold text-ink">{t('tables')}</h1>
                <div className="flex flex-wrap justify-end gap-1">
                  {['all', ...areas].map((a) => (
                    <button
                      key={a}
                      onClick={() => setArea(a)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        area === a ? 'bg-ink text-amber-50' : 'bg-white text-stone-500 shadow-sm hover:text-ink'
                      }`}
                    >
                      {a === 'all' ? t('allAreas') : a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="-mx-5 flex items-stretch gap-2 overflow-x-auto px-5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filteredTables.map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => {
                      setTableId(tb.id)
                      const existing = unpaid.find(
                        (o) => o.table_name === tb.name && o.source !== 'qr' && o.customer_status !== 'new',
                      )
                      if (existing && !draft.length) setActiveOrderId(existing.id)
                    }}
                    title={tb.note ?? undefined}
                    className={`relative flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      tableId === tb.id
                        ? 'border-brand-700 bg-brand-800 text-amber-50 shadow-md'
                        : tb.occupied
                          ? 'border-amber-200/80 bg-amber-50/70 text-amber-800 hover:border-amber-300'
                          : 'border-stone-200/80 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700'
                    }`}
                  >
                    {tb.photo_url && (
                      <>
                        <img
                          src={tb.photo_url}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover ${tableId === tb.id ? 'opacity-25' : tb.occupied ? 'opacity-45' : 'opacity-60'}`}
                        />
                        <span className={`absolute inset-0 ${tableId === tb.id ? 'bg-brand-900/50' : 'bg-white/35'}`} />
                      </>
                    )}
                    <Armchair size={16} strokeWidth={2} className="relative" />
                    <span className="relative font-semibold">{tb.name.replace('Bàn ', '').replace('Table ', '')}</span>
                    <span className="relative text-[10px] font-normal opacity-60">
                      {tb.seats} {t('seats')}
                    </span>
                    {tb.note && (
                      <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400 shadow" title={tb.note} />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setTableId(null)}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    tableId === null
                      ? 'border-brand-700 bg-brand-800 text-amber-50 shadow-md'
                      : 'border-dashed border-stone-300 bg-white/60 text-stone-500 hover:border-brand-400 hover:text-brand-700'
                  }`}
                >
                  <ShoppingBag size={16} strokeWidth={2} /> {t('takeaway')}
                </button>
              </div>
            </div>

            {/* Search + categories */}
            <div className="flex items-center gap-2.5">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full rounded-xl border border-stone-200/80 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>
            </div>
            <div className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                    category === c ? 'bg-ink text-amber-50 shadow-sm' : 'bg-white text-stone-500 shadow-sm active:text-ink'
                  }`}
                >
                  {c === 'all' ? t('all') : c}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 pb-5 sm:grid-cols-3 xl:grid-cols-4">
                {products_filtered.map((p) => (
                  <button
                    key={p.id}
                    disabled={p.sold_out}
                    onClick={() => openCustomize(p)}
                    className={`group flex flex-col overflow-hidden rounded-2xl border border-stone-200/70 bg-white text-left shadow-sm transition-all ${
                      p.sold_out
                        ? 'cursor-not-allowed opacity-55'
                        : 'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div className="relative flex h-[4.5rem] items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100/60">
                      {p.sold_out ? (
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-danger">
                          {t('soldOut')}
                        </span>
                      ) : (
                        <Coffee className="text-brand-300 transition-transform group-hover:scale-110" size={28} strokeWidth={1.8} />
                      )}
                      {draft.some((d) => d.product.id === p.id) && !p.sold_out && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-800 text-[10px] font-bold text-amber-50">
                          {draft.filter((d) => d.product.id === p.id).reduce((s, d) => s + d.quantity, 0)}
                        </span>
                      )}
                    </div>
                    <div className="px-3 pb-3 pt-2.5">
                      <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                      <p className="mt-0.5 text-[13px] font-bold tabular-nums text-brand-700">
                        {formatMoney(p.price, lang)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden w-[340px] border-l border-stone-200/70 bg-white lg:block">
        {cartPanel}
        <div className="h-56 border-t border-stone-200/70">
          <div className="flex items-center gap-1 border-b border-stone-100 px-4 py-2">
            <button
              onClick={() => setSideTab('unpaid')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                sideTab === 'unpaid' ? 'bg-brand-50 text-brand-800' : 'text-stone-400 hover:text-ink'
              }`}
            >
              <Clock3 size={12} /> {t('unpaidOrders')} ({unpaid.length})
            </button>
            <button
              onClick={() => {
                setSideTab('history')
                refreshOrderLists()
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                sideTab === 'history' ? 'bg-brand-50 text-brand-800' : 'text-stone-400 hover:text-ink'
              }`}
            >
              <History size={12} /> {t('todayHistory')} ({todayDone.length})
            </button>
          </div>
          <div className="h-[calc(100%-41px)] overflow-y-auto px-3 py-2">
            {sideTab === 'unpaid' ? (
              unpaid.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-stone-300">{t('noUnpaid')}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {unpaid.map((o) => (
                    <li key={o.id}>
                      <button
                        onClick={() => {
                          setActiveOrderId(o.id)
                          setDraft([])
                          const tb = tables.find((x) => x.name === o.table_name)
                          setTableId(tb?.id ?? null)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${
                          activeOrderId === o.id
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-stone-200 hover:border-brand-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                            {o.table_name ?? t('takeaway')}
                            {o.source === 'qr' && (
                              <span className="rounded-full bg-brand-100 px-1.5 text-[9px] font-bold text-brand-800">QR</span>
                            )}
                          </p>
                          <p className="truncate text-[10px] text-stone-400">
                            {o.staff_name ?? '—'} ·{' '}
                            {new Date(o.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink">
                          {formatMoney(o.total, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : todayDone.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-stone-300">{t('noHistory')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {todayDone.map((o) => (
                  <li key={o.id} className="rounded-xl bg-stone-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                        {o.table_name ?? t('takeaway')}
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-ready">
                          {o.payment_method === 'cash' ? t('cash') : o.payment_method === 'transfer' ? t('transfer') : t('card')}
                        </span>
                      </p>
                      <span className="text-[12px] font-bold tabular-nums text-ink">{formatMoney(o.total, lang)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <p className="flex items-center gap-1 text-[10px] text-stone-400">
                        <User size={9} /> {o.staff_name ?? '—'} ·{' '}
                        {o.completed_at
                          ? new Date(o.completed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : '—'}{' '}
                        · {o.order_items.reduce((s, i) => s + i.quantity, 0)} {t('items')}
                      </p>
                      <button
                        onClick={() =>
                          onPrintReceipt({
                            id: o.id.slice(0, 8).toUpperCase(),
                            tableName: o.table_name ?? t('takeaway'),
                            items: o.order_items
                              .filter((i) => i.status !== 'cancelled')
                              .map((i) => ({
                                name: i.product_name, size: i.size, qty: i.quantity,
                                price: i.unit_price, toppings: (i.toppings ?? []) as ToppingPick[], note: i.note,
                              })),
                            subtotal: o.order_items.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.unit_price * i.quantity, 0),
                            discountAmount: o.discount_amount ?? 0,
                            discountLabel: o.discount_type === 'amount'
                              ? `${t('discountAmount')}: ${formatMoney(o.discount_amount ?? 0, lang)}`
                              : o.discount_type === 'percent'
                                ? `${t('discountPercent')}: ${o.discount_value}% (-${formatMoney(o.discount_amount ?? 0, lang)})`
                                : null,
                            total: o.total,
                            paymentMethod: o.payment_method,
                            cashier: o.staff_name ?? cashierName,
                          })
                        }
                        className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium text-stone-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Printer size={11} /> {t('reprint')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 right-0 top-0 w-full max-w-sm shadow-2xl">{cartPanel}</div>
        </div>
      )}
      {totalQty > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-safe right-4 z-30 flex items-center gap-2 rounded-full bg-brand-800 px-5 py-3.5 text-sm font-semibold text-amber-50 shadow-xl shadow-brand-900/30 lg:hidden"
        >
          <Receipt size={17} /> {totalQty} {t('items')} · {formatMoney(total, lang)}
        </button>
      )}

      {/* Customize modal */}
      {customize && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{customize.product.name}</h3>
              <button
                onClick={() => setCustomize(null)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-stone-600">
              <CupSoda size={14} /> {t('chooseSize')}
            </p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(['S', 'M', 'L'] as const).map((s) => {
                const price = sizePrice(customize.product, s)
                return (
                  <button
                    key={s}
                    onClick={() => setCustomize((c) => (c ? { ...c, size: s } : c))}
                    className={`flex flex-col items-center rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                      customize.size === s
                        ? 'border-brand-700 bg-brand-800 text-amber-50 shadow-md'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300'
                    }`}
                  >
                    {s}
                    <span className={`text-[11px] font-normal tabular-nums ${customize.size === s ? 'text-amber-100/80' : 'text-stone-400'}`}>
                      {formatMoney(price, lang)}
                    </span>
                  </button>
                )
              })}
            </div>

            {toppings.length > 0 && (
              <>
                <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('chooseToppings')}</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {toppings.map((tp) => {
                    const picked = customize.toppings.some((x) => x.name === tp.name)
                    return (
                      <button
                        key={tp.id}
                        onClick={() =>
                          setCustomize((c) =>
                            c
                              ? {
                                  ...c,
                                  toppings: picked
                                    ? c.toppings.filter((x) => x.name !== tp.name)
                                    : [...c.toppings, { name: tp.name, price: tp.price }],
                                }
                              : c,
                          )
                        }
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                          picked ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-stone-200 text-stone-600 hover:border-brand-300'
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
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-stone-600">
                <StickyNote size={13} /> {t('note')}
              </span>
              <input
                value={customize.note}
                onChange={(e) => setCustomize((c) => (c ? { ...c, note: e.target.value } : c))}
                placeholder={t('notePlaceholder')}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            <button
              onClick={() => {
                addItem(customize.product, customize.size, sizePrice(customize.product, customize.size), customize.toppings, customize.note)
                setCustomize(null)
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99]"
            >
              <Plus size={15} strokeWidth={2.5} /> {t('addToOrder')} ·{' '}
              {formatMoney(
                (sizePrice(customize.product, customize.size) + customize.toppings.reduce((s, tp) => s + tp.price, 0)),
                lang,
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payOpen && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{t('payment')}</h3>
              <button
                onClick={() => setPayOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-stone-50 px-4 py-3.5 text-center">
              <p className="text-xs text-stone-400">
                {table?.name ?? t('takeaway')} · {totalQty} {t('items')}
              </p>
              {discountAmount > 0 && (
                <p className="mt-1 text-xs text-stone-400">
                  <span>{t('subtotalBeforeDiscount')}: </span>
                  <span className="tabular-nums line-through">{formatMoney(total, lang)}</span>
                </p>
              )}
              {discountAmount > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-danger">{discountLabel}</p>
              )}
              <p className="mt-0.5 text-[26px] font-bold tabular-nums tracking-tight text-ink">
                {formatMoney(finalTotal, lang)}
              </p>
            </div>

            {/* Discount selector */}
            <div className="mb-4">
              <div className="mb-2 flex gap-1.5">
                {([['none', t('discountNone')], ['amount', t('discountAmount')], ['percent', t('discountPercent')]] as [DiscountType, string][]).map(([dt, label]) => (
                  <button
                    key={dt}
                    onClick={() => { setDiscountType(dt); setDiscountInput('') }}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-all ${
                      discountType === dt ? 'border-brand-700 bg-brand-800 text-amber-50' : 'border-stone-200 text-stone-600 hover:border-brand-300'
                    }`}
                  >{label}</button>
                ))}
              </div>
              {discountType !== 'none' && (
                <input
                  inputMode="numeric"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={discountType === 'amount' ? t('discountValue') + ' (VND)' : t('discountValue') + ' (%)'}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                />
              )}
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { icon: Banknote, label: t('cash'), method: 'cash' },
                { icon: Smartphone, label: t('transfer'), method: 'transfer' },
                { icon: CreditCard, label: t('card'), method: 'card' },
              ].map(({ icon: Icon, label, method }) => (
                <button
                  key={method}
                  onClick={() => submitOrder(method)}
                  disabled={sending}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-3.5 text-xs font-semibold text-stone-600 transition-all hover:border-brand-300 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Icon size={20} strokeWidth={2} />} {label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  value={paidInput}
                  onChange={(e) => {
                    setPaidInput(e.target.value.replace(/[^0-9]/g, ''))
                    setChangeShown(null)
                  }}
                  placeholder={t('customerPaidPlaceholder')}
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                />
                <button
                  onClick={() => setChangeShown(changeDue ?? -1)}
                  disabled={paidNum <= 0}
                  className="shrink-0 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-stone-200 disabled:opacity-50"
                >
                  {t('calcChange')}
                </button>
              </div>
              {changeShown !== null && (
                <p className={`mt-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${
                  changeShown < 0
                    ? 'bg-red-50 text-danger'
                    : 'bg-emerald-50 text-ready'
                }`}>
                  {changeShown < 0
                    ? `${t('notEnough')}: ${formatMoney(-changeShown, lang)}`
                    : `${t('changeDue')}: ${formatMoney(changeShown, lang)}`}
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => submitOrder(null)}
                disabled={sending}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-60"
              >
                {t('saveWithoutPay')}
              </button>
              <button
                onClick={() => submitOrder('cash')}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ready py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />} {t('complete')}
              </button>
            </div>

            <button
              onClick={() =>
                onPrintReceipt({
                  id: 'TẠM TÍNH',
                  tableName: table?.name ?? t('takeaway'),
                  items: draft.map((i) => ({
                    name: i.product.name, size: i.size, qty: i.quantity,
                    price: i.sizePrice + i.toppings.reduce((s, tp) => s + tp.price, 0),
                    toppings: i.toppings,
                  })),
                  subtotal: total,
                  discountAmount,
                  discountLabel,
                  total: finalTotal,
                  paymentMethod: null,
                  cashier: cashierName,
                })
              }
              disabled={draft.length === 0}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-stone-400 transition-colors hover:text-brand-700 disabled:opacity-40"
            >
              <Printer size={13} /> {t('printProvisional')}
            </button>
          </div>
        </div>
      )}

      {/* Move / merge table modal + split items */}
      {moveOpen && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-h-[85vh] sm:max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                {moveTab === 'table' ? <ArrowRightLeft size={17} /> : <Scissors size={17} />}
                {moveTab === 'table' ? t('mergeTable') : t('splitItems')}
              </h3>
              <button onClick={() => setMoveOpen(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>

            <div className="mb-4 flex gap-1.5">
              <button
                onClick={() => setMoveTab('table')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  moveTab === 'table' ? 'bg-brand-50 text-brand-800' : 'text-stone-400 hover:text-ink'
                }`}
              >
                <ArrowRightLeft size={13} /> {t('mergeTable')}
              </button>
              <button
                onClick={() => setMoveTab('split')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  moveTab === 'split' ? 'bg-brand-50 text-brand-800' : 'text-stone-400 hover:text-ink'
                }`}
              >
                <Scissors size={13} /> {t('splitItems')}
              </button>
            </div>

            {moveTab === 'table' ? (
              <>
                <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('pickOrderToMove')}</p>
                {openOrders.length === 0 ? (
                  <p className="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-400">{t('noOpenOrdersToMove')}</p>
                ) : (
                  <ul className="mb-4 flex max-h-44 flex-col gap-1.5 overflow-y-auto">
                    {openOrders.map((o) => (
                      <li key={o.id}>
                        <button
                          onClick={() => setMoveOrderId(o.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                            moveOrderId === o.id
                              ? 'border-brand-700 bg-brand-50 text-brand-800'
                              : 'border-stone-200 text-stone-600 hover:border-brand-300'
                          }`}
                        >
                          <span className="text-[13px] font-semibold">{o.table_name ?? t('takeaway')}</span>
                          <span className="text-[11px] tabular-nums text-stone-400">
                            {o.order_items.length} {t('items')} · {formatMoney(o.total, lang)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('targetTable')}</p>
                <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {tables.map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setMoveTarget(tb.name)}
                      className={`flex flex-col items-center rounded-xl border px-1 py-2 text-[11px] font-semibold transition-all ${
                        moveTarget === tb.name
                          ? 'border-brand-700 bg-brand-800 text-amber-50'
                          : 'border-stone-200 text-stone-600 hover:border-brand-300'
                      }`}
                    >
                      <Armchair size={14} />
                      {tb.name.replace('Bàn ', '').replace('Table ', '')}
                    </button>
                  ))}
                  <button
                    onClick={() => setMoveTarget(t('takeaway'))}
                    className={`flex flex-col items-center rounded-xl border px-1 py-2 text-[11px] font-semibold transition-all ${
                      moveTarget === t('takeaway')
                        ? 'border-brand-700 bg-brand-800 text-amber-50'
                        : 'border-dashed border-stone-300 text-stone-500 hover:border-brand-400'
                    }`}
                  >
                    <ShoppingBag size={14} /> {t('takeaway')}
                  </button>
                </div>

                <button
                  onClick={doMove}
                  disabled={moving || !moveOrderId || !moveTarget}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {moving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                  {t('confirmMove')}
                </button>
              </>
            ) : (
              <>
                {/* Split: pick source order */}
                <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('pickOrderToMove')}</p>
                {openOrders.length === 0 ? (
                  <p className="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-400">{t('noOpenOrdersToMove')}</p>
                ) : (
                  <ul className="mb-3 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                    {openOrders.map((o) => (
                      <li key={o.id}>
                        <button
                          onClick={() => { setSplitSourceId(o.id); setSplitItemId(null); setSplitTargetId(null) }}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                            splitSourceId === o.id
                              ? 'border-brand-700 bg-brand-50 text-brand-800'
                              : 'border-stone-200 text-stone-600 hover:border-brand-300'
                          }`}
                        >
                          <span className="text-[13px] font-semibold">{o.table_name ?? t('takeaway')}</span>
                          <span className="text-[11px] tabular-nums text-stone-400">
                            {o.order_items.filter((i) => i.status !== 'cancelled').length} {t('items')} · {formatMoney(o.total, lang)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pick item to move */}
                {splitSourceId && (
                  <>
                    <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('splitHint')}</p>
                    {(() => {
                      const src = openOrders.find((o) => o.id === splitSourceId)
                      const movable = src?.order_items.filter((i) => i.status !== 'cancelled') ?? []
                      if (movable.length === 0)
                        return <p className="mb-3 rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-400">{t('noItemsToMove')}</p>
                      return (
                        <ul className="mb-3 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                          {movable.map((i) => (
                            <li key={i.id}>
                              <button
                                onClick={() => setSplitItemId(i.id)}
                                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2 text-left transition-all ${
                                  splitItemId === i.id
                                    ? 'border-brand-700 bg-brand-50 text-brand-800'
                                    : 'border-stone-200 text-stone-600 hover:border-brand-300'
                                }`}
                              >
                                <span className="min-w-0 truncate text-[13px] font-medium">{i.product_name} ({i.size}) ×{i.quantity}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-stone-400">{formatMoney(i.unit_price * i.quantity, lang)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}
                  </>
                )}

                {/* Pick target order */}
                {splitItemId && (
                  <>
                    <p className="mb-2 text-[13px] font-semibold text-stone-600">{t('pickTargetOrder')}</p>
                    <ul className="mb-5 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                      {openOrders.filter((o) => o.id !== splitSourceId).map((o) => (
                        <li key={o.id}>
                          <button
                            onClick={() => setSplitTargetId(o.id)}
                            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                              splitTargetId === o.id
                                ? 'border-brand-700 bg-brand-50 text-brand-800'
                                : 'border-stone-200 text-stone-600 hover:border-brand-300'
                            }`}
                          >
                            <span className="text-[13px] font-semibold">{o.table_name ?? t('takeaway')}</span>
                            <span className="text-[11px] tabular-nums text-stone-400">
                              {o.order_items.length} {t('items')} · {formatMoney(o.total, lang)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <button
                  onClick={doSplitItem}
                  disabled={splitting || !splitItemId || !splitTargetId}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {splitting ? <Loader2 size={15} className="animate-spin" /> : <Scissors size={15} />}
                  {t('moveItemConfirm')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
