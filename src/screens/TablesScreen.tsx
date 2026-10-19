import { useEffect, useRef, useState } from 'react'
import {
  Armchair, Plus, Pencil, Trash2, X, Check, Loader2, Camera, ImageOff, QrCode, Printer,
} from 'lucide-react'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'
import { fetchTables, insertTable, updateTable, deleteTable, uploadTablePhoto } from '../lib/api'
import type { CafeTable } from '../lib/api'

interface TableForm {
  id: string | null
  name: string
  area: string
  seats: string
  note: string
  photo_url: string | null
  sort_order: number
}

const EMPTY: TableForm = { id: null, name: '', area: 'Tầng 1', seats: '2', note: '', photo_url: null, sort_order: 0 }

export default function TablesScreen() {
  const { t, lang } = useI18n()
  const [tables, setTables] = useState<CafeTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<TableForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)
  const [qrFor, setQrFor] = useState<CafeTable | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const load = () => {
    fetchTables()
      .then(setTables)
      .catch(() => setError(lang === 'vi' ? 'Không tải được danh sách bàn.' : 'Failed to load tables.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const areas = [...new Set(tables.map((tb) => tb.area))]

  const saveForm = async () => {
    if (!form || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const patch = {
        name: form.name.trim(),
        area: form.area.trim() || 'Tầng 1',
        seats: Number(form.seats) || 2,
        sort_order: form.sort_order,
        note: form.note.trim() || null,
        photo_url: form.photo_url,
      }
      if (form.id) {
        const updated = await updateTable(form.id, patch)
        setTables((xs) => xs.map((x) => (x.id === updated.id ? updated : x)))
      } else {
        const created = await insertTable({ ...patch, sort_order: tables.length + 1 })
        setTables((xs) => [...xs, created])
      }
      setForm(null)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được bàn.' : 'Could not save table.')
    } finally {
      setSaving(false)
    }
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !form) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadTablePhoto(file)
      setForm((f) => (f ? { ...f, photo_url: url } : f))
    } catch {
      setError(lang === 'vi' ? 'Không tải được ảnh. Thử ảnh nhỏ hơn 5MB.' : 'Photo upload failed. Try an image under 5MB.')
    } finally {
      setUploading(false)
    }
  }

  const openQr = async (tb: CafeTable) => {
    setQrFor(tb)
    const url = `${window.location.origin}/menu?ban=${encodeURIComponent(tb.name)}`
    try {
      setQrDataUrl(await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#292018', light: '#ffffff' } }))
    } catch {
      setQrDataUrl(null)
    }
  }

  const printQr = () => {
    if (!qrFor || !qrDataUrl) return
    const w = window.open('', '_blank', 'width=420,height=560')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR ${qrFor.name}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; }
        h2 { margin: 0 0 4px; }
        p { margin: 0 0 16px; color: #78716c; font-size: 13px; }
        img { width: 280px; height: 280px; }
      </style></head><body>
      <h2>${qrFor.name}</h2>
      <p>Quét mã để gọi món tại bàn</p>
      <img src="${qrDataUrl}" alt="QR" />
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    w.document.close()
  }

  const removeTable = async (tb: CafeTable) => {
    try {
      await deleteTable(tb.id)
      setTables((xs) => xs.filter((x) => x.id !== tb.id))
    } catch {
      setError(lang === 'vi' ? 'Không xóa được bàn.' : 'Could not delete table.')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <Armchair size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('tables')}</h1>
            <p className="text-xs text-stone-400">
              {tables.length} {lang === 'vi' ? 'bàn' : 'tables'} · {areas.length} {t('area').toLowerCase()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setForm({ ...EMPTY, sort_order: tables.length + 1 })}
          className="flex items-center gap-1.5 rounded-xl bg-brand-800 px-4 py-2 text-xs font-semibold text-amber-50 shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
        >
          <Plus size={15} /> {t('addTable')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        areas.map((a) => (
          <div key={a} className="mb-6">
            <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-stone-400">{a}</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-8">
              {tables.filter((tb) => tb.area === a).map((tb) => (
                <div
                  key={tb.id}
                  className={`panel group relative flex flex-col items-center gap-1 overflow-hidden p-0 ${tb.note ? 'ring-1 ring-amber-200' : ''}`}
                >
                  {tb.photo_url ? (
                    <button
                      onClick={() => setViewPhoto(tb.photo_url)}
                      className="relative h-20 w-full cursor-zoom-in overflow-hidden bg-stone-100"
                    >
                      <img
                        src={tb.photo_url}
                        alt={tb.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {tb.note && (
                        <span className="absolute bottom-1 left-1 max-w-[85%] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {tb.note}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="flex h-16 w-full items-center justify-center border-b border-stone-100 bg-gradient-to-br from-brand-50 to-brand-100/50">
                      <Armchair size={22} className="text-brand-400" strokeWidth={1.8} />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-0.5 px-2 pb-2.5 pt-1.5">
                    <p className="text-[13px] font-semibold text-ink">{tb.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {tb.seats} {t('seats')}
                    </p>
                    {!tb.photo_url && tb.note && (
                      <p className="max-w-full truncate text-[10px] italic text-warn" title={tb.note}>{tb.note}</p>
                    )}
                  </div>
                  <div className="absolute right-1.5 top-1.5 flex rounded-lg bg-white/85 shadow-sm backdrop-blur">
                    <button
                      onClick={() =>
                        setForm({
                          id: tb.id, name: tb.name, area: tb.area,
                          seats: String(tb.seats), sort_order: tb.sort_order,
                          note: tb.note ?? '', photo_url: tb.photo_url,
                        })
                      }
                      className="p-1.5 text-stone-400 hover:text-brand-700"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => openQr(tb)}
                      className="p-1.5 text-stone-400 hover:text-brand-700"
                      title="QR"
                    >
                      <QrCode size={13} />
                    </button>
                    <button
                      onClick={() => removeTable(tb)}
                      className="p-1.5 text-stone-300 hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {qrFor && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xs text-center">
            <h3 className="text-base font-bold text-ink">{qrFor.name}</h3>
            <p className="mb-4 text-xs text-stone-400">{t('qrHint')}</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR" className="mx-auto mb-4 h-52 w-52 rounded-xl border border-stone-100" />
            ) : (
              <div className="mb-4 flex h-52 items-center justify-center text-stone-300">
                <Loader2 className="animate-spin" size={24} />
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => setQrFor(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                {t('closeReceipt')}
              </button>
              <button
                onClick={printQr}
                disabled={!qrDataUrl}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-2.5 text-sm font-semibold text-amber-50 hover:bg-brand-700 disabled:opacity-60"
              >
                <Printer size={15} /> {t('printQr')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => setViewPhoto(null)} />
          <div className="relative max-h-full w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <img src={viewPhoto} alt="" className="max-h-[75vh] w-full object-contain" />
            <button
              onClick={() => setViewPhoto(null)}
              className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-ink shadow"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {form && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{form.id ? t('editTable') : t('addTable')}</h3>
              <button onClick={() => setForm(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('tableName')}</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                placeholder="Bàn 11"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <div className="mb-5">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('tablePhoto')}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              {form.photo_url ? (
                <div className="relative overflow-hidden rounded-xl">
                  <img src={form.photo_url} alt="" className="h-28 w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg bg-white/90 p-1.5 text-stone-600 shadow hover:text-brand-700"
                    >
                      <Camera size={15} />
                    </button>
                    <button
                      onClick={() => setForm((f) => (f ? { ...f, photo_url: null } : f))}
                      className="rounded-lg bg-white/90 p-1.5 text-stone-600 shadow hover:text-danger"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-xs font-medium text-stone-500 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  {t('takeTablePhoto')}
                </button>
              )}
            </div>

            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('tableNote')}</span>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => (f ? { ...f, note: e.target.value } : f))}
                placeholder={t('tableNotePlaceholder')}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </label>

            <div className="mb-5 grid grid-cols-2 gap-2.5">
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('area')}</span>
                <input
                  value={form.area}
                  onChange={(e) => setForm((f) => (f ? { ...f, area: e.target.value } : f))}
                  list="area-list"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
                />
                <datalist id="area-list">
                  {areas.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('tableSeats')}</span>
                <input
                  inputMode="numeric"
                  value={form.seats}
                  onChange={(e) => setForm((f) => (f ? { ...f, seats: e.target.value.replace(/\D/g, '') } : f))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white"
                />
              </label>
            </div>
            <button
              onClick={saveForm}
              disabled={saving || !form.name.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {form.id ? t('saveChanges') : t('addTable')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
