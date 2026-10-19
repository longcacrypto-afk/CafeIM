import { useEffect, useState } from 'react'
import {
  ClipboardList, Plus, Pencil, Trash2, X, Check, Coffee, PackageOpen, Loader2, Search,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import {
  fetchCategories, fetchProducts, insertProduct, updateProduct, deleteProduct, insertCategory,
} from '../lib/api'
import type { Category, Product } from '../lib/api'

interface FormState {
  id: string | null
  name: string
  price: string
  category_id: string
}

const EMPTY_FORM: FormState = { id: null, name: '', price: '', category_id: '' }

export default function MenuScreen() {
  const { t, lang } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    Promise.all([fetchCategories(), fetchProducts()])
      .then(([cats, prods]) => {
        setCategories(cats)
        setProducts(prods)
      })
      .catch(() => setError(lang === 'vi' ? 'Không tải được menu.' : 'Failed to load menu.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' })
  }

  const startEdit = (p: Product) => {
    setForm({ id: p.id, name: p.name, price: String(p.price), category_id: p.category_id ?? '' })
  }

  const saveForm = async () => {
    if (!form || !form.name.trim() || !form.price) return
    setSaving(true)
    setError(null)
    try {
      const price = parseInt(form.price.replace(/\D/g, ''), 10)
      if (form.id) {
        const updated = await updateProduct(form.id, { name: form.name.trim(), price, category_id: form.category_id })
        setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await insertProduct({ name: form.name.trim(), price, category_id: form.category_id })
        setProducts((ps) => [...ps, created])
      }
      setForm(null)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được món.' : 'Could not save item.')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async (p: Product) => {
    try {
      await deleteProduct(p.id)
      setProducts((ps) => ps.filter((x) => x.id !== p.id))
    } catch {
      setError(lang === 'vi' ? 'Không xóa được món.' : 'Could not delete item.')
    }
  }

  const toggleSoldOut = async (p: Product) => {
    const updated = await updateProduct(p.id, { sold_out: !p.sold_out })
    setProducts((ps) => ps.map((x) => (x.id === updated.id ? updated : x)))
  }

  const addCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    setAddingCategory(true)
    try {
      const created = await insertCategory(name, categories.length + 1)
      setCategories((cs) => [...cs, created])
      setNewCategory('')
    } catch {
      setError(lang === 'vi' ? 'Không thêm được nhóm món.' : 'Could not add category.')
    } finally {
      setAddingCategory(false)
    }
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const visible = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <ClipboardList size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('menuManage')}</h1>
            <p className="text-xs text-stone-400">
              {products.length} {t('items')} · {categories.length} {t('navMenu')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-44 rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs shadow-sm outline-none focus:border-brand-400"
            />
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-xl bg-brand-800 px-4 py-2 text-xs font-semibold text-amber-50 shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
          >
            <Plus size={15} /> {t('addItem')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {/* Category chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-sm"
          >
            {c.name}
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder={t('newCategory')}
            className="w-32 rounded-full border border-dashed border-stone-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-400"
          />
          <button
            onClick={addCategory}
            disabled={addingCategory || !newCategory.trim()}
            className="rounded-full bg-stone-100 p-1.5 text-stone-500 transition-colors hover:bg-brand-100 hover:text-brand-700 disabled:opacity-40"
          >
            {addingCategory ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <div
              key={p.id}
              className={`panel flex items-center gap-3.5 p-4 transition-opacity ${p.sold_out ? 'opacity-60' : ''}`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/60 text-brand-400">
                <Coffee size={22} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="mt-0.5 text-[13px] font-bold tabular-nums text-brand-700">{formatMoney(p.price, lang)}</p>
                <p className="mt-0.5 text-[11px] text-stone-400">{categoryName(p.category_id)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => toggleSoldOut(p)}
                  title={t('soldOut')}
                  className={`rounded-lg p-2 transition-colors ${
                    p.sold_out ? 'bg-red-50 text-danger' : 'text-stone-300 hover:bg-amber-50 hover:text-warn'
                  }`}
                >
                  {p.sold_out ? <PackageOpen size={16} /> : <Coffee size={16} />}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => removeProduct(p)}
                  className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-stone-400">—</p>
          )}
        </div>
      )}

      {/* Create / edit modal */}
      {form && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">
                {form.id ? t('editItem') : t('addItem')}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('itemName')}</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('itemPrice')}</span>
              <input
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((f) => (f ? { ...f, price: e.target.value.replace(/\D/g, '') } : f))}
                placeholder="25000"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('itemCategory')}</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => (f ? { ...f, category_id: e.target.value } : f))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <button
              onClick={saveForm}
              disabled={saving || !form.name.trim() || !form.price}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {form.id ? t('saveChanges') : t('addItem')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
