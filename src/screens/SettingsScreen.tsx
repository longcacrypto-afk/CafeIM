import { useEffect, useState } from 'react'
import { Store, Save, Loader2, CheckCircle2, Puzzle, Copy, Check, ExternalLink, Power } from 'lucide-react'
import { useI18n } from '../i18n'
import { fetchSettings, updateSettings, fetchAppModules, toggleAppModule } from '../lib/api'
import type { CafeSettings } from '../lib/api'
import { moduleLabel, moduleHint, INSTALL_PROFILES } from '../lib/modules'
import type { AppModuleRow } from '../lib/modules'

export default function SettingsScreen({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t, lang } = useI18n()
  const [form, setForm] = useState<CafeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<AppModuleRow[]>([])
  const [mBusy, setMBusy] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<'small' | 'standard' | 'full'>('standard')
  const [subdomain, setSubdomain] = useState('')
  const [appUrl, setAppUrl] = useState('')
  const [installUrl, setInstallUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((s) => setForm(s ? { ...s } : { name: '', address: '', hotline: '', receipt_footer: '', telegram_chat_ids: [] }))
      .catch(() => setError(lang === 'vi' ? 'Không tải được cấu hình.' : 'Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [lang])

  useEffect(() => {
    if (isAdmin) {
      fetchAppModules()
        .then(setModules)
        .catch(() => {})
    }
  }, [isAdmin])
  const save = async () => {
    if (!form || !form.name.trim()) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await updateSettings({
        name: form.name.trim(),
        address: form.address.trim(),
        hotline: form.hotline.trim(),
        receipt_footer: form.receipt_footer.trim(),
      })
      setForm((f) => (f ? { ...f, ...updated } : f))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được cấu hình.' : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const doToggle = async (m: AppModuleRow) => {
    setMBusy(m.id)
    try {
      const updated = await toggleAppModule(m.id, !m.enabled)
      setModules((ms) => ms.map((x) => (x.id === m.id ? updated : x)))
    } catch {
      setError(lang === 'vi' ? 'Không bật tắt được module.' : 'Could not toggle module.')
    } finally {
      setMBusy(null)
    }
  }

  const generateInstall = () => {
    const sd = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').trim()
    if (!sd) return
    const apex = location.hostname.replace(/^[^.]+\./, '') || 'yourdomain.com'
    const pub = appUrl.trim().replace(/\/$/, '')
    const qs = new URLSearchParams({ profile: profileId, cafe: pub ? '1' : '0', install: '1' })
    setInstallUrl(`https://${sd}.${apex}/?${qs.toString()}${pub ? `&app=${encodeURIComponent(pub)}` : ''}`)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
          <Store size={21} />
        </span>
        <div>
          <h1 className="text-base font-bold text-ink">{t('storeSettings')}</h1>
          <p className="text-xs text-stone-400">{t('storeSettingsHint')}</p>
        </div>
      </div>

      <div className="max-w-md">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
        )}

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('storeName')}</span>
          <input
            value={form?.name ?? ''}
            onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('storeAddress')}</span>
          <input
            value={form?.address ?? ''}
            onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('storeHotline')}</span>
          <input
            value={form?.hotline ?? ''}
            onChange={(e) => setForm((f) => (f ? { ...f, hotline: e.target.value } : f))}
            inputMode="tel"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('receiptFooter')}</span>
          <textarea
            value={form?.receipt_footer ?? ''}
            onChange={(e) => setForm((f) => (f ? { ...f, receipt_footer: e.target.value } : f))}
            rows={2}
            placeholder={t('receiptFooterPlaceholder')}
            className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
          <span className="mt-1 block text-[11px] text-stone-400">{t('receiptFooterHint')}</span>
        </label>

        <button
          onClick={save}
          disabled={saving || !form?.name.trim()}
          className="flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? t('saved') : t('saveChanges')}
        </button>

        {isAdmin && (
          <div className="mt-8 border-t border-stone-200 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                <Puzzle size={21} />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">{t('advancedModules')}</h2>
                <p className="text-xs text-stone-400">{t('advancedModulesHint')}</p>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {modules.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{moduleLabel(m, lang)}</p>
                    <p className="truncate text-[11px] text-stone-400">{moduleHint(m, lang)}</p>
                  </div>
                  <button
                    onClick={() => doToggle(m)}
                    disabled={mBusy === m.id}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                      m.enabled ? 'bg-ready/10 text-ready' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {mBusy === m.id ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                    {m.enabled ? t('moduleEnabled') : t('moduleDisabled')}
                  </button>
                </li>
              ))}
              {modules.length === 0 && (
                <li className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-[12px] text-stone-300">
                  {lang === 'vi' ? 'Chưa có module nào' : 'No modules'}
                </li>
              )}
            </ul>

            <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
              <h3 className="text-[14px] font-bold text-ink">{t('installLink')}</h3>
              <p className="mt-0.5 text-[11px] text-stone-400">{t('installLinkHint')}</p>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-stone-500">{lang === 'vi' ? 'Gói module' : 'Profile'}</span>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value as 'small' | 'standard' | 'full')}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-brand-400"
                  >
                    {INSTALL_PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>{lang === 'vi' ? p.name_vi : p.name_en}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-stone-500">{t('installSubdomain')}</span>
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="coffea"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-brand-400"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-medium text-stone-500">{t('installAppUrl')}</span>
                  <input
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://app.yourdomain.com"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-brand-400"
                  />
                </label>
              </div>

              <button
                onClick={generateInstall}
                disabled={!subdomain.trim()}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-brand-800 px-4 py-2.5 text-[13px] font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
              >
                <ExternalLink size={14} /> {t('installGenerate')}
              </button>

              {installUrl && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-ready/20 bg-emerald-50 px-3 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium tabular-nums text-ink">{installUrl}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(installUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? t('installCopied') : t('installCopy')}
                  </button>
                </div>
              )}

              <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{t('installHintPwa')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
