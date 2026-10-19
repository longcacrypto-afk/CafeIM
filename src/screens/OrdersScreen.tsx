import { useEffect, useMemo, useState } from 'react'
import {
  Receipt, Loader2, Printer, Clock3, User, Armchair, Search, Ban, Check, Wallet, Eye,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import { fetchOrdersSince, payOrder } from '../lib/api'
import type { Order, OrderItemRow, DiscountType } from '../lib/api'
import type { ReceiptData } from './PosScreen'

type Range = 'today' | '7d' | '30d'
type Filter = 'all' | 'open' | 'completed' | 'cancelled'

interface OrderWithItems extends Order {
  order_items: OrderItemRow[]
}

export default function OrdersScreen({ cashierName, onPrintReceipt }: {
  cashierName: string
  onPrintReceipt: (r: ReceiptData) => void
}) {
  const { t, lang } = useI18n()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('today')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    const d = new Date()
    if (range === 'today') d.setHours(0, 0, 0, 0)
    else d.setDate(d.getDate() - (range === '7d' ? 7 : 30))
    fetchOrdersSince(d.toISOString())
      .then(setOrders)
      .catch(() => setError(lang === 'vi' ? 'Không tải được danh sách đơn hàng.' : 'Failed to load orders.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [range, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })
      : '—'

  const isOpen = (o: Order) => ['pending', 'brewing', 'ready'].includes(o.status)
  const liveItems = (o: OrderWithItems) => o.order_items.filter((i) => i.status !== 'cancelled')

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (filter === 'open' && !isOpen(o)) return false
        if (filter === 'completed' && o.status !== 'completed') return false
        if (filter === 'cancelled' && o.status !== 'cancelled') return false
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          const hay = `${o.table_name ?? ''} ${o.id.slice(0, 8)} ${o.staff_name ?? ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [orders, filter, search], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const collected = orders
    .filter((o) => o.status === 'completed')
    .reduce((s, o) => s + o.total, 0)
  const unpaid = orders.filter(isOpen).reduce((s, o) => s + o.total, 0)
  const orderCount = orders.length

  const detail = filtered.find((o) => o.id === detailId) ?? orders.find((o) => o.id === detailId) ?? null

  const collectNow = async (o: OrderWithItems) => {
    setPayingId(o.id)
    setError(null)
    try {
      const paid = await payOrder(o.id, 'cash')
      setOrders((xs) => xs.map((x) => (x.id === paid.id ? { ...x, ...paid } : x)))
    } catch {
      setError(lang === 'vi' ? 'Không thu được tiền đơn này.' : 'Could not collect payment.')
    } finally {
      setPayingId(null)
    }
  }

  const reprint = (o: OrderWithItems) =>
    onPrintReceipt({
      id: o.id.slice(0, 8).toUpperCase(),
      tableName: o.table_name ?? t('takeaway'),
      items: liveItems(o).map((i) => ({
        name: i.product_name, size: i.size, qty: i.quantity,
        price: i.unit_price, toppings: (i.toppings ?? []) as { name: string; price: number }[],
        note: i.note,
      })),
      subtotal: liveItems(o).reduce((s, i) => s + i.unit_price * i.quantity, 0),
      discountAmount: o.discount_amount ?? 0,
      discountLabel:
        o.discount_type === 'amount'
          ? `Giảm tiền: ${formatMoney(o.discount_amount ?? 0, lang)}`
          : o.discount_type === 'percent'
            ? `Giảm ${o.discount_value}% (-${formatMoney(o.discount_amount ?? 0, lang)})`
            : null,
      total: o.total,
      paymentMethod: o.payment_method,
      cashier: o.staff_name ?? cashierName,
    })

  const statusBadge = (o: Order) => {
    if (o.status === 'completed')
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-ready">{t('orderStatusCompleted')}</span>
    if (o.status === 'cancelled')
      return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-danger">{t('orderStatusCancelled')}</span>
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-warn">{t('orderStatusOpen')}</span>
  }

  const payLabel = (m: string | null) =>
    m === 'cash' ? t('cash') : m === 'transfer' ? t('transfer') : m === 'card' ? t('card') : '—'

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <Receipt size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('navOrders')}</h1>
            <p className="text-xs text-stone-400">{t('ordersManageHint')}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-3 gap-2.5 sm:max-w-xl">
        <div className="panel px-4 py-3">
          <p className="text-[11px] text-stone-400">{t('orderCount')}</p>
          <p className="text-[18px] font-bold tabular-nums text-ink">{orderCount}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-[11px] text-stone-400">{t('ordersSummaryRevenue')}</p>
          <p className="text-[18px] font-bold tabular-nums text-ready">{formatMoney(collected, lang)}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-[11px] text-stone-400">{t('ordersSummaryPending')}</p>
          <p className="text-[18px] font-bold tabular-nums text-warn">{formatMoney(unpaid, lang)}</p>
        </div>
      </div>

      {/* Range chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([['today', t('ordersRangeToday')], ['7d', t('ordersRange7')], ['30d', t('ordersRange30')]] as [Range, string][]).map(([r, label]) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              range === r ? 'bg-ink text-amber-50' : 'bg-white text-stone-500 shadow-sm hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([['all', t('all')], ['open', t('orderStatusOpen')], ['completed', t('orderStatusCompleted')], ['cancelled', t('orderStatusCancelled')]] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === f ? 'bg-brand-800 text-amber-50' : 'bg-white text-stone-500 shadow-sm hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchOrdersPlaceholder')}
            className="w-full rounded-xl border border-stone-200/80 bg-white py-2 pl-9 pr-3 text-[13px] shadow-sm outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-[13px] text-stone-300">
          {t('noOrdersInList')}
        </p>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {filtered.map((o) => (
            <li key={o.id} className="panel p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <button onClick={() => setDetailId(detailId === o.id ? null : o.id)} className="min-w-0 flex-1 text-left">
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <Armchair size={13} className="text-brand-500" />
                    {o.table_name ?? t('takeaway')}
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
                      {o.id.slice(0, 8).toUpperCase()}
                    </span>
                    {o.source === 'qr' && <span className="rounded-full bg-brand-100 px-1.5 text-[9px] font-bold text-brand-800">QR</span>}
                    {statusBadge(o)}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-400">
                    {liveItems(o).map((i) => `${i.product_name} ×${i.quantity}`).join(', ') || '—'}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[14px] font-bold tabular-nums text-ink">{formatMoney(o.total, lang)}</span>
                  <button
                    onClick={() => setDetailId(detailId === o.id ? null : o.id)}
                    className="rounded-lg border border-stone-200 p-1.5 text-stone-400 transition-colors hover:border-brand-300 hover:text-brand-700"
                    title={t('orderDetail')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => reprint(o)}
                    className="rounded-lg border border-stone-200 p-1.5 text-stone-400 transition-colors hover:border-brand-300 hover:text-brand-700"
                    title={t('reprint')}
                  >
                    <Printer size={14} />
                  </button>
                  {isOpen(o) && (
                    <button
                      onClick={() => collectNow(o)}
                      disabled={payingId === o.id}
                      className="flex items-center gap-1 rounded-lg bg-ready px-2.5 py-1.5 text-[11px] font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                    >
                      {payingId === o.id ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
                      {t('payNow')}
                    </button>
                  )}
                </div>
              </div>

              {/* detail panel */}
              {detailId === o.id && (
                <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-4">
                    <div>
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-stone-400">
                        <Clock3 size={9} /> {t('createdAtCol')}
                      </p>
                      <p className="font-medium text-ink">{fmt(o.created_at)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-stone-400">
                        <Check size={9} /> {t('completedAtCol')}
                      </p>
                      <p className="font-medium text-ink">{fmt(o.completed_at)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-stone-400">
                        <User size={9} /> {t('soldBy')}
                      </p>
                      <p className="font-medium text-ink">{o.staff_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-stone-400">{t('payment')}</p>
                      <p className="font-medium text-ink">{payLabel(o.payment_method)}</p>
                    </div>
                  </div>

                  <ul className="mt-3 flex flex-col gap-1.5">
                    {o.order_items.map((i) => (
                      <li key={i.id} className="rounded-lg bg-white px-3 py-2 text-[12px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`min-w-0 truncate font-medium ${i.status === 'cancelled' ? 'text-stone-300 line-through' : 'text-ink'}`}>
                            {i.product_name} ({i.size}) ×{i.quantity}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-ink">
                            {formatMoney(i.unit_price * i.quantity, lang)}
                          </span>
                        </div>
                        {(i.toppings?.length > 0 || i.note || i.cancel_reason) && (
                          <p className="mt-0.5 text-[11px] text-stone-400">
                            {i.toppings?.length > 0 && `${i.toppings.map((tp) => tp.name).join(', ')} · `}
                            {i.note}
                            {i.cancel_reason && <span className="text-danger"> · Hủy: {i.cancel_reason}</span>}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(o.discount_amount ?? 0) > 0 && (
                    <p className="mt-2 text-[12px] font-semibold text-danger">
                      {t('discount')}: -{formatMoney(o.discount_amount ?? 0, lang)}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
