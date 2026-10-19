import { useEffect, useMemo, useState } from 'react'
import {
  ChartLine, DollarSign, Receipt, TrendingUp, Download, ArrowUpRight, ArrowDownRight, Loader2,
  TriangleAlert, ListOrdered, Users, User,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import { fetchCompletedOrdersSince, fetchIngredients, fetchOrderReport } from '../lib/api'
import type { Order, OrderItemRow, Ingredient, OrderReportRow } from '../lib/api'

type FullOrder = Order & { order_items: OrderItemRow[] }

const RANGES = [
  { key: 'today', days: 1 },
  { key: 'last7', days: 7 },
  { key: 'last30', days: 30 },
] as const

const HOURLY_SLOTS = ['6-8h', '8-10h', '10-12h', '12-14h', '14-16h', '16-18h', '18-20h', '20-22h']

function StatCard({ icon: Icon, label, value, delta }: {
  icon: typeof DollarSign; label: string; value: string; delta?: number
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              delta >= 0 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-danger'
            }`}
          >
            {delta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3.5 text-[21px] font-bold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-stone-400">{label}</p>
    </div>
  )
}

export default function ReportsScreen() {
  const { t, lang } = useI18n()
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('last7')
  const [orders, setOrders] = useState<FullOrder[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [orderRows, setOrderRows] = useState<OrderReportRow[]>([])
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 7

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    setLoading(true)
    Promise.all([fetchCompletedOrdersSince(since), fetchOrderReport(days), fetchIngredients()])
      .then(([ords, rows, ings]) => {
        setOrders(ords)
        setOrderRows(rows)
        setIngredients(ings)
      })
      .catch(() => setError(lang === 'vi' ? 'Không tải được báo cáo.' : 'Failed to load reports.'))
      .finally(() => setLoading(false))
  }, [rangeKey, days, lang])

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.total, 0)
    const count = orders.length
    const cash = orders.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + o.total, 0)
    const transfer = revenue - cash
    const productStats = new Map<string, { qty: number; revenue: number }>()
    for (const o of orders)
      for (const i of o.order_items) {
        const cur = productStats.get(i.product_name) ?? { qty: 0, revenue: 0 }
        cur.qty += i.quantity
        cur.revenue += i.unit_price * i.quantity
        productStats.set(i.product_name, cur)
      }
    const top = [...productStats.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
    const delta = (() => {
      if (days === 1) return undefined
      const half = Math.floor(days / 2)
      const mid = Date.now() - half * 86400000
      const recent = orders.filter((o) => o.completed_at && new Date(o.completed_at).getTime() >= mid)
      const older = orders.filter((o) => o.completed_at && new Date(o.completed_at).getTime() < mid)
      const r1 = recent.reduce((s, o) => s + o.total, 0)
      const r0 = older.reduce((s, o) => s + o.total, 0)
      if (r0 === 0) return undefined
      return Math.round(((r1 - r0) / r0) * 100)
    })()
    return { revenue, count, avg: count ? Math.round(revenue / count) : 0, cash, transfer, top, delta }
  }, [orders, days])

  const daily = useMemo(() => {
    const map = new Map<string, number>()
    for (let d = days - 1; d >= 0; d--) {
      const day = new Date(Date.now() - d * 86400000)
      map.set(day.toISOString().slice(0, 10), 0)
    }
    for (const o of orders) {
      if (!o.completed_at) continue
      const key = o.completed_at.slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + o.total)
    }
    return [...map.entries()].map(([date, value]) => ({
      label: lang === 'vi'
        ? new Date(date).toLocaleDateString('vi-VN', days > 7 ? { day: 'numeric', month: 'numeric' } : { weekday: 'short' })
        : new Date(date).toLocaleDateString('en-US', days > 7 ? { day: 'numeric', month: 'numeric' } : { weekday: 'short' }),
      value,
    }))
  }, [orders, days, lang])

  const hourly = useMemo(() => {
    const totals = HOURLY_SLOTS.map(() => 0)
    for (const o of orders) {
      if (!o.completed_at) continue
      const h = new Date(o.completed_at).getHours()
      const slot = Math.min(HOURLY_SLOTS.length - 1, Math.max(0, Math.floor((h - 6) / 2)))
      if (h >= 6 && h < 22) totals[slot] += o.total
    }
    const sum = totals.reduce((a, b) => a + b, 0) || 1
    return HOURLY_SLOTS.map((hour, i) => ({ hour, pct: Math.round((totals[i] / sum) * 100) }))
  }, [orders])

  const lowStock = ingredients.filter((i) => i.stock <= i.min_stock)

  const staffNames = useMemo(
    () => [...new Set(orderRows.map((r) => r.staff_name).filter((n): n is string => !!n))].sort(),
    [orderRows],
  )
  const filteredRows = useMemo(
    () => (staffFilter === 'all' ? orderRows : orderRows.filter((r) => r.staff_name === staffFilter)),
    [orderRows, staffFilter],
  )
  const filteredOrders = useMemo(
    () => (staffFilter === 'all' ? orders : orders.filter((o) => o.staff_name === staffFilter)),
    [orders, staffFilter],
  )
  const staffStats = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    for (const o of orders) {
      const name = o.staff_name ?? '—'
      const cur = map.get(name) ?? { revenue: 0, count: 0 }
      cur.revenue += o.total
      cur.count += 1
      map.set(name, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue)
  }, [orders])

  const shown = staffFilter === 'all' ? stats : {
    revenue: filteredOrders.reduce((s, o) => s + o.total, 0),
    count: filteredOrders.length,
    avg: filteredOrders.length ? Math.round(filteredOrders.reduce((s, o) => s + o.total, 0) / filteredOrders.length) : 0,
    cash: filteredOrders.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + o.total, 0),
    transfer: filteredOrders.filter((o) => o.payment_method !== 'cash').reduce((s, o) => s + o.total, 0),
    top: stats.top,
    delta: stats.delta,
  }
  const maxDaily = Math.max(...daily.map((d) => d.value), 1)
  const maxTop = stats.top[0]?.qty ?? 1

  const exportCsv = () => {
    const header = 'order_id,date,table,payment,total,staff,items\n'
    const body = filteredRows
      .map((r) =>
        [r.order_id.slice(0, 8), r.completed_at?.slice(0, 16).replace('T', ' '), r.table_name ?? '', r.payment_method ?? '', r.total, r.staff_name ?? '', `"${(r.item_summary ?? '').replace(/"/g, '""')}"`].join(','),
      )
      .join('\n')
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${rangeKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <ChartLine size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('reports')}</h1>
            <p className="text-xs text-stone-400">
              {t('updated')} {new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="-mx-4 flex w-full items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  rangeKey === r.key ? 'bg-ink text-amber-50' : 'bg-white text-stone-500 shadow-sm hover:text-ink'
                }`}
              >
                {t(r.key)}
              </button>
            ))}
          </div>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="max-w-[160px] shrink-0 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 shadow-sm outline-none transition-colors focus:border-brand-400"
          >
            <option value="all">{t('allStaff')}</option>
            {staffNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 shadow-sm transition-colors hover:text-ink"
          >
            <Download size={13} /> {t('exportCsv')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5">
              <p className="flex items-center gap-2 text-[13px] font-bold text-warn">
                <TriangleAlert size={15} /> {t('lowStockAlert')} ({lowStock.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStock.map((i) => (
                  <span key={i.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-warn shadow-sm">
                    {i.name}: {i.stock.toLocaleString('vi-VN')} {i.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={DollarSign} label={t('revenue')} value={formatMoney(shown.revenue, lang)} delta={shown.delta} />
            <StatCard icon={Receipt} label={t('orderCount')} value={String(shown.count)} />
            <StatCard icon={TrendingUp} label={t('avgPerOrder')} value={formatMoney(shown.avg, lang)} />
            <StatCard
              icon={DollarSign}
              label={t('cashVsTransfer')}
              value={`${formatMoney(shown.cash, lang)} / ${formatMoney(shown.transfer, lang)}`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="panel p-5 lg:col-span-3">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">{t('revenueTrend')}</h2>
                <span className="text-[11px] text-stone-400">{t('unitVnd')}</span>
              </div>
              <div className="flex h-52 items-end gap-2">
                {daily.map((d, i) => (
                  <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                      {formatMoney(d.value, lang)}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-brand-300 transition-all group-hover:bg-brand-600"
                      style={{ height: `${Math.max(2, (d.value / maxDaily) * 100)}%` }}
                    />
                    <span className="text-[11px] text-stone-400">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-bold text-ink">{t('topItems')}</h2>
              {stats.top.length === 0 ? (
                <p className="text-sm text-stone-400">—</p>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {stats.top.slice(0, 6).map((item, i) => (
                    <li key={item.name} className="flex items-center gap-3">
                      <span
                        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                          i === 0 ? 'bg-brand-800 text-amber-50' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{item.name}</p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-brand-400" style={{ width: `${(item.qty / maxTop) * 100}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-ink">
                          {item.qty} {t('cups')}
                        </p>
                        <p className="text-[10px] tabular-nums text-stone-400">{formatMoney(item.revenue, lang)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Staff performance */}
          {staffStats.length > 0 && (
            <div className="panel mt-4 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
                <Users size={15} /> {t('staffPerformance')}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {staffStats.map(([name, v]) => (
                  <li key={name} className="rounded-xl border border-stone-100 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      <User size={13} className="text-stone-400" /> {name === '—' ? t('unknownStaff') : name}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-ink">{formatMoney(v.revenue, lang)}</p>
                    <p className="text-[11px] text-stone-400">{v.count} {t('orderCount').toLowerCase()}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold text-ink">{t('hourlyRevenue')}</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {hourly.map((h) => (
                <div
                  key={h.hour}
                  className="rounded-xl px-2 py-3 text-center"
                  style={{ backgroundColor: `rgba(168, 109, 53, ${0.05 + (h.pct / 100) * 1.4})` }}
                >
                  <p className="text-[11px] text-stone-500">{h.hour}</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${h.pct > 20 ? 'text-brand-900' : 'text-ink'}`}>
                    {h.pct}%
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-xs text-stone-400">{t('peakHint')}</p>
          </div>

          {/* Order detail table */}
          <div className="panel mt-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <ListOrdered size={15} /> {t('orderDetail')}
              </h2>
              <span className="text-xs text-stone-400">
                {t('totalInPeriod')}: <b className="tabular-nums text-ink">{formatMoney(filteredRows.reduce((s, r) => s + r.total, 0), lang)}</b>
                {filteredRows.some((r) => r.discount_amount > 0) && (
                  <span className="ml-3">{t('totalDiscount')}: <b className="tabular-nums text-danger">{formatMoney(filteredRows.reduce((s, r) => s + r.discount_amount, 0), lang)}</b></span>
                )}
              </span>
            </div>
            {filteredRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-400">{t('noOrdersInPeriod')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
                      <th className="px-5 py-2.5 font-semibold">{t('receiptNo')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('tables')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('payment')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('cashier')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('items')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('discountCol')}</th>
                      <th className="px-3 py-2.5 text-right font-semibold">{t('revenueCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 30).map((r) => (
                      <tr key={r.order_id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60">
                        <td className="px-5 py-2.5 font-mono text-[11px] text-stone-400">{r.order_id.slice(0, 8)}</td>
                        <td className="px-3 py-2.5 font-medium text-ink">{r.table_name ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                            {r.payment_method === 'cash' ? t('cash') : r.payment_method === 'transfer' ? t('transfer') : r.payment_method === 'card' ? t('card') : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-stone-500">{r.staff_name ?? '—'}</td>
                        <td className="max-w-[240px] truncate px-3 py-2.5 text-stone-500">{r.item_summary}</td>
                        <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-danger">
                          {r.discount_amount ? `-${formatMoney(r.discount_amount, lang)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                          {formatMoney(r.total, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
