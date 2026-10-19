import { useEffect, useState } from 'react'
import { Users, UserPlus, X, Check, Loader2, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { fetchStaff, inviteStaff } from '../lib/api'
import type { Role } from '../lib/auth'

const ROLES: { value: Role; labelKey: 'owner' | 'manager' | 'navPos' | 'navKitchen' }[] = [
  { value: 'owner', labelKey: 'owner' },
  { value: 'manager', labelKey: 'manager' },
  { value: 'cashier', labelKey: 'navPos' },
  { value: 'barista', labelKey: 'navKitchen' },
]

export default function StaffScreen() {
  const { t, lang } = useI18n()
  const [staff, setStaff] = useState<{ id: string; name: string; role: Role }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: Role } | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const load = () => {
    fetchStaff()
      .then(setStaff)
      .catch(() => setError(lang === 'vi' ? 'Không tải được nhân viên.' : 'Failed to load staff.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    if (!form || !form.name.trim() || !form.email.includes('@') || form.password.length < 6) return
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      await inviteStaff(form.email.trim(), form.password, form.name.trim(), form.role)
      setStaff((xs) => [...xs, { id: 'new', name: form.name.trim(), role: form.role }])
      setDone(lang === 'vi' ? `Đã tạo tài khoản cho ${form.name.trim()}` : `Account created for ${form.name.trim()}`)
      setForm(null)
    } catch {
      setError(
        lang === 'vi'
          ? 'Không tạo được tài khoản (email có thể đã tồn tại).'
          : 'Could not create account (email may already exist).',
      )
    } finally {
      setBusy(false)
    }
  }

  const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.labelKey ?? 'navPos'

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <Users size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('staff')}</h1>
            <p className="text-xs text-stone-400">
              {staff.length} {lang === 'vi' ? 'nhân viên' : 'staff'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setForm({ name: '', email: '', password: '', role: 'cashier' })}
          className="flex items-center gap-1.5 rounded-xl bg-brand-800 px-4 py-2 text-xs font-semibold text-amber-50 shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
        >
          <UserPlus size={15} /> {t('addStaff')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}
      {done && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-ready">{done}</div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((s) => (
            <li key={s.id} className="panel flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-800">
                {s.name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{s.name}</p>
                <p className="text-xs text-stone-400">{t(roleLabel(s.role))}</p>
              </div>
              <Trash2 size={15} className="text-stone-200" />
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{t('addStaff')}</h3>
              <button onClick={() => setForm(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('staffName')}</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('staffEmail')}</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ten@cafepos.vn"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('password')}</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="≥ 6 ký tự"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('staffRole')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setForm((f) => (f ? { ...f, role: r.value } : f))}
                    className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                      form.role === r.value
                        ? 'border-brand-700 bg-brand-800 text-amber-50'
                        : 'border-stone-200 text-stone-600 hover:border-brand-300'
                    }`}
                  >
                    {t(r.labelKey)}
                  </button>
                ))}
              </div>
            </label>
            <button
              onClick={create}
              disabled={busy || !form.name.trim() || !form.email.includes('@') || form.password.length < 6}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {t('saveChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
