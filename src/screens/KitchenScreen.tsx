import { useEffect, useState } from 'react'
import { Check, Clock, ChefHat, Coffee, CircleCheck, Loader2, Ban, XCircle, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { fetchOpenOrders, completeOrder, fetchCancelRequests, approveCancelItem } from '../lib/api'
import type { Order, OrderItemRow } from '../lib/api'
import type { Role } from '../lib/auth'

type FullOrder = Order & { order_items: OrderItemRow[] }

interface Ticket {
  id: string
  table: string
  staff: string | null
  minutes: number
  items: { name: string; qty: number; note: string | null; done: boolean }[]
}

function toTickets(orders: FullOrder[]): Ticket[] {
  const now = Date.now()
  return orders.map((o) => ({
    id: o.id,
    table: o.table_name ?? '—',
    staff: o.staff_name,
    minutes: Math.max(0, Math.floor((now - new Date(o.created_at).getTime()) / 60000)),
    items: o.order_items.map((i) => ({
      name: `${i.product_name} (${i.size})`,
      qty: i.quantity,
      note: i.note,
      done: o.status === 'ready',
    })),
  }))
}

function Ticket({ ticket, onDone }: { ticket: Ticket; onDone: () => void }) {
  const { t } = useI18n()
  const warning = ticket.minutes >= 5
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${warning ? 'border-danger/40' : 'border-stone-200/70'}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${warning ? 'bg-red-50/80' : 'bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          <Coffee size={15} className="text-brand-600" />
          <span className="text-sm font-bold text-ink">{ticket.table}</span>
          {ticket.staff && <span className="text-[11px] font-medium text-stone-400">· {ticket.staff}</span>}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
            warning ? 'bg-danger text-white' : 'bg-stone-200/70 text-stone-500'
          }`}
        >
          <Clock size={11} /> {ticket.minutes}
          {t('minutes')}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5 px-4 py-3.5">
        {ticket.items.map((it, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                it.done ? 'bg-ready/15 text-ready' : 'bg-brand-800 text-amber-50'
              }`}
            >
              {it.qty}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-medium ${it.done ? 'text-stone-300 line-through' : 'text-ink'}`}>
                {it.name}
              </p>
              {it.note && <p className="mt-0.5 text-[11px] italic text-warn">"{it.note}"</p>}
            </div>
            {it.done && <CircleCheck size={15} className="mt-0.5 shrink-0 text-ready" />}
          </li>
        ))}
      </ul>
      <div className="mt-auto px-3 pb-3">
        <button
          onClick={onDone}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ready/25 bg-ready/5 py-2.5 text-[13px] font-semibold text-ready transition-all hover:bg-ready hover:text-white active:scale-[0.99]"
        >
          <Check size={15} strokeWidth={2.5} /> {t('completeOrder')}
        </button>
      </div>
    </div>
  )
}

interface CancelRequest {
  id: string
  product_name: string
  quantity: number
  cancel_reason: string | null
  order: { table_name: string | null; status: string } | null
}

export default function KitchenScreen({ role }: { role: Role }) {
  const { t } = useI18n()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [cancelReqs, setCancelReqs] = useState<CancelRequest[]>([])
  const [loading, setLoading] = useState(true)
  const canApproveCancel = role === 'owner' || role === 'manager'

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [orders, reqs] = await Promise.all([
          fetchOpenOrders(),
          canApproveCancel ? fetchCancelRequests() : Promise.resolve([]),
        ])
        if (alive) {
          setTickets(toTickets(orders))
          setCancelReqs(reqs as unknown as CancelRequest[])
        }
      } catch {
        /* keep previous state */
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [canApproveCancel])

  const finish = async (id: string) => {
    await completeOrder(id, 'cash')
    setTickets((ts) => ts.filter((x) => x.id !== id))
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <ChefHat size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('brewQueue')}</h1>
            <p className="text-xs text-stone-400">
              {tickets.length} {t('waitingOrders')} · {t('autoRefresh')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ready" /> {t('live')}
        </div>
      </div>

      {/* Cancel requests (owner) */}
      {canApproveCancel && cancelReqs.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-bold text-warn">
            <Ban size={14} /> {t('cancelRequests')} ({cancelReqs.length})
          </h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {cancelReqs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">
                    {r.product_name} ×{r.quantity} · {r.order?.table_name ?? '—'}
                  </p>
                  <p className="text-[11px] italic text-stone-400">"{r.cancel_reason}"</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={async () => {
                      await approveCancelItem(r.id, true)
                      setCancelReqs((rs) => rs.filter((x) => x.id !== r.id))
                    }}
                    className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[11px] font-bold text-danger transition-colors hover:bg-danger hover:text-white"
                  >
                    <Check size={12} strokeWidth={3} /> {t('approve')}
                  </button>
                  <button
                    onClick={async () => {
                      await approveCancelItem(r.id, false)
                      setCancelReqs((rs) => rs.filter((x) => x.id !== r.id))
                    }}
                    className="flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition-colors hover:bg-stone-200"
                  >
                    <X size={12} /> {t('reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <CircleCheck size={52} strokeWidth={1.5} className="text-ready/30" />
          <p className="text-[15px] font-medium text-stone-400">{t('noOrders')}</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pb-6 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((tk) => (
            <Ticket key={tk.id} ticket={tk} onDone={() => finish(tk.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
