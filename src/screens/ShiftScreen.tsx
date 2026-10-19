import { useEffect, useMemo, useState } from 'react'
import {
  Clock, Wallet, ArrowRightLeft, CreditCard, Receipt, Loader2, PlayCircle, CheckCircle2,
  TriangleAlert, Plus, Trash2, X,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import {
  fetchMyOpenShift, fetchShiftsSince, openShift, closeShiftRpc,
  fetchExpensesSince, insertExpense,
} from '../lib/api'
import type { Shift, Expense } from '../lib/api'

export default function ShiftScreen() {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState<Shift | null>(null)
  const [past, setPast] = useState<Shift[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingCash, setOpeningCash] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [busy, setBusy] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [expForm, setExpForm] = useState<{ title: string; amount: string } | null>(null)

  const load = () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    Promise.all([fetchMyOpenShift(), fetchShiftsSince(since), fetchExpensesSince(since)])
      .then(([o, ps, exs]) => {
        setOpen(o)
        setPast(ps)
        setExpenses(exs)
      })
      .catch(() => setError(lang === 'vi' ? 'Không tải được ca.' : 'Failed to load shifts.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doOpen = async () => {
    const cash = Number(openingCash.replace(/\D/g, '')) || 0
    setBusy(true)
    setError(null)
    try {
      const s = await openShift(cash)
      setOpen(s)
      setPast((ps) => [s, ...ps])
      setOpeningCash('')
    } catch {
      setError(lang === 'vi' ? 'Không mở được ca. Có thể bạn đã có ca đang mở.' : 'Could not open shift. You may already have one open.')
    } finally {
      setBusy(false)
    }
  }

  const doClose = async () => {
    const cash = Number(countedCash.replace(/\D/g, '')) || 0
    setBusy(true)
    setError(null)
    try {
      const closed = await closeShiftRpc(cash)
      setOpen(null)
      setShowClose(false)
      setCountedCash('')
      setPast((ps) => ps.map((p) => (p.id === closed.id ? closed : p)))
    } catch {
      setError(lang === 'vi' ? 'Không chốt được ca.' : 'Could not close shift.')
    } finally {
      setBusy(false)
    }
  }

  const addExpense = async () => {
    if (!expForm) return
    const amount = Number(expForm.amount.replace(/\D/g, '')) || 0
    if (!expForm.title.trim() || amount <= 0) return
    setBusy(true)
    try {
      const created = await insertExpense({ title: expForm.title.trim(), amount, shift_id: open?.id ?? null })
      setExpenses((xs) => [created, ...xs])
      setExpForm(null)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được chi phí.' : 'Could not save expense.')
    } finally {
      setBusy(false)
    }
  }

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })

  const liveRevenue = open ? open.revenue_cash + open.revenue_transfer + open.revenue_card : 0

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
          <Clock size={21} />
        </span>
        <div>
          <h1 className="text-base font-bold text-ink">{t('shiftTitle')}</h1>
          <p className="text-xs text-stone-400">{t('shiftHint')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : !open ? (
        /* Open shift form */
        <div className="mx-auto mt-10 max-w-sm">
          <div className="panel p-6 text-center">
            <PlayCircle size={44} className="mx-auto text-brand-300" strokeWidth={1.6} />
            <h2 className="mt-3 text-[15px] font-bold text-ink">{t('openShift')}</h2>
            <p className="mx-auto mt-1 max-w-[260px] text-xs text-stone-400">{t('openShiftHint')}</p>
            <input
              inputMode="numeric"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value.replace(/\D/g, ''))}
              placeholder={t('openingCashPlaceholder')}
              className="mt-5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-base font-semibold tabular-nums outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
            <button
              onClick={doOpen}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} {t('openShift')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Live shift dashboard */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="panel p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Wallet size={17} />
              </span>
              <p className="mt-3.5 text-[21px] font-bold tabular-nums text-ink">{formatMoney(liveRevenue, lang)}</p>
              <p className="mt-0.5 text-xs text-stone-400">{t('shiftRevenue')}</p>
            </div>
            <div className="panel p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Receipt size={17} />
              </span>
              <p className="mt-3.5 text-[21px] font-bold tabular-nums text-ink">{open.order_count}</p>
              <p className="mt-0.5 text-xs text-stone-400">{t('orderCount')}</p>
            </div>
            <div className="panel p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <ArrowRightLeft size={17} />
              </span>
              <p className="mt-3.5 text-[21px] font-bold tabular-nums text-ink">{formatMoney(open.revenue_cash, lang)}</p>
              <p className="mt-0.5 text-xs text-stone-400">{t('cash')}</p>
            </div>
            <div className="panel p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <CreditCard size={17} />
              </span>
              <p className="mt-3.5 text-[21px] font-bold tabular-nums text-ink">
                {formatMoney(open.revenue_transfer + open.revenue_card, lang)}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">{t('transfer')} + {t('card')}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowClose(true)}
              className="flex items-center gap-2 rounded-xl bg-ready px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <CheckCircle2 size={17} /> {t('closeShift')}
            </button>
            <button
              onClick={() => setExpForm({ title: '', amount: '' })}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Plus size={16} /> {t('addExpense')}
            </button>
            <p className="text-xs text-stone-400">
              {t('shiftOpenedAt')} {fmtTime(open.opened_at)} · {t('openingCash')}: {formatMoney(open.opening_cash, lang)}
            </p>
          </div>

          {/* Expense list */}
          {expenses.length > 0 && (
            <div className="panel mt-4 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">{t('expenses')}</h2>
                <span className="text-xs text-stone-400">
                  {t('totalInPeriod')}: <b className="tabular-nums text-danger">-{formatMoney(totalExpenses, lang)}</b>
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-stone-50">
                {expenses.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{e.title}</p>
                      <p className="text-[11px] text-stone-400">{fmtTime(e.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-danger">
                        -{formatMoney(e.amount, lang)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Past shifts */}
      {past.filter((s) => s.closed_at).length > 0 && (
        <div className="panel mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">{t('pastShifts')}</h2>
          <ul className="flex flex-col gap-2">
            {past
              .filter((s) => s.closed_at)
              .slice(0, 10)
              .map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{s.staff_name}</p>
                    <p className="text-[11px] text-stone-400">
                      {fmtTime(s.opened_at)} → {fmtTime(s.closed_at!)} · {s.order_count} {t('items')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[13px] font-bold tabular-nums text-ink">
                      {formatMoney(s.revenue_cash + s.revenue_transfer + s.revenue_card, lang)}
                    </p>
                    {s.difference !== null && s.difference !== 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-warn">
                        <TriangleAlert size={10} /> {s.difference > 0 ? '+' : ''}
                        {formatMoney(s.difference, lang)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Close shift modal */}
      {showClose && open && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{t('closeShift')}</h3>
              <button onClick={() => setShowClose(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-stone-50 px-4 py-3.5 text-sm">
              <div className="flex justify-between py-0.5 text-stone-500">
                <span>{t('openingCash')}</span>
                <span className="tabular-nums">{formatMoney(open.opening_cash, lang)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-stone-500">
                <span>{t('cash')}</span>
                <span className="tabular-nums">+{formatMoney(open.revenue_cash, lang)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-stone-200 pt-1.5 font-bold text-ink">
                <span>{t('expectedCash')}</span>
                <span className="tabular-nums">{formatMoney(open.opening_cash + open.revenue_cash, lang)}</span>
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('countedCash')}</span>
              <input
                autoFocus
                inputMode="numeric"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-base font-semibold tabular-nums outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
              {countedCash && (
                <p
                  className={`mt-2 text-center text-[13px] font-semibold tabular-nums ${
                    Number(countedCash) - (open.opening_cash + open.revenue_cash) !== 0 ? 'text-warn' : 'text-ready'
                  }`}
                >
                  {t('difference')}:{' '}
                  {formatMoney(Number(countedCash) - (open.opening_cash + open.revenue_cash), lang)}
                </p>
              )}
            </label>

            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-warn">{t('closeShiftWarning')}</p>

            <button
              onClick={doClose}
              disabled={busy || !countedCash}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ready py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {t('closeShift')}
            </button>
          </div>
        </div>
      )}

      {/* Expense modal */}
      {expForm && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xs">
            <h3 className="mb-4 text-base font-bold text-ink">{t('addExpense')}</h3>
            <input
              autoFocus
              value={expForm.title}
              onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
              placeholder={t('expenseTitle')}
              className="mb-2.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
            <input
              inputMode="numeric"
              value={expForm.amount}
              onChange={(e) => setExpForm({ ...expForm, amount: e.target.value.replace(/\D/g, '') })}
              placeholder={t('expenseAmount')}
              className="mb-4 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white"
            />
            <button
              onClick={addExpense}
              disabled={busy}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {t('saveChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
