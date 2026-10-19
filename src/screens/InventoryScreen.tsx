import { useEffect, useMemo, useState } from 'react'
import {
  Boxes, Plus, Pencil, Trash2, X, Check, Loader2, PackagePlus, TriangleAlert, CircleCheck,
  CookingPot, Link2, Unlink,
} from 'lucide-react'
import { useI18n, formatMoney } from '../i18n'
import {
  fetchIngredients, fetchRecipeLines, fetchProducts, insertIngredient, updateIngredient,
  deleteIngredient, restockIngredient, saveRecipeLine, deleteRecipeLine,
} from '../lib/api'
import type { Ingredient, RecipeLine, Product } from '../lib/api'

type Tab = 'stock' | 'recipes'

interface IngForm {
  id: string | null
  name: string
  unit: Ingredient['unit']
  stock: string
  min_stock: string
}

const EMPTY_ING: IngForm = { id: null, name: '', unit: 'g', stock: '0', min_stock: '0' }

function fmtQty(n: number) {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

export default function InventoryScreen() {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<Tab>('stock')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<RecipeLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<IngForm | null>(null)
  const [restockFor, setRestockFor] = useState<{ ing: Ingredient; amount: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [recipeProduct, setRecipeProduct] = useState<string | null>(null)
  const [newLine, setNewLine] = useState<{ ingredient_id: string; qty: string } | null>(null)

  const load = () => {
    Promise.all([fetchIngredients(), fetchRecipeLines(), fetchProducts()])
      .then(([ings, lines, prods]) => {
        setIngredients(ings)
        setRecipes(lines)
        setProducts(prods)
      })
      .catch(() => setError(lang === 'vi' ? 'Không tải được kho.' : 'Failed to load inventory.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lowStock = ingredients.filter((i) => i.stock <= i.min_stock)

  const saveForm = async () => {
    if (!form || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const patch = {
        name: form.name.trim(),
        unit: form.unit,
        stock: Number(form.stock) || 0,
        min_stock: Number(form.min_stock) || 0,
      }
      if (form.id) {
        const updated = await updateIngredient(form.id, patch)
        setIngredients((xs) => xs.map((x) => (x.id === updated.id ? updated : x)))
      } else {
        const created = await insertIngredient(patch)
        setIngredients((xs) => [...xs, created])
      }
      setForm(null)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được nguyên liệu.' : 'Could not save ingredient.')
    } finally {
      setSaving(false)
    }
  }

  const doRestock = async () => {
    if (!restockFor) return
    const amount = Number(restockFor.amount)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      const updated = await restockIngredient(restockFor.ing.id, amount)
      setIngredients((xs) => xs.map((x) => (x.id === updated.id ? updated : x)))
      setRestockFor(null)
    } catch {
      setError(lang === 'vi' ? 'Không nhập được kho.' : 'Could not restock.')
    } finally {
      setSaving(false)
    }
  }

  const removeIngredient = async (ing: Ingredient) => {
    try {
      await deleteIngredient(ing.id)
      setIngredients((xs) => xs.filter((x) => x.id !== ing.id))
      setRecipes((rs) => rs.filter((r) => r.ingredient_id !== ing.id))
    } catch {
      setError(lang === 'vi' ? 'Không xóa được nguyên liệu.' : 'Could not delete ingredient.')
    }
  }

  const addLine = async () => {
    if (!recipeProduct || !newLine || !newLine.ingredient_id) return
    const qty = Number(newLine.qty)
    if (!qty || qty <= 0) return
    try {
      await saveRecipeLine(recipeProduct, newLine.ingredient_id, qty)
      setRecipes((rs) => [
        ...rs.filter((r) => !(r.product_id === recipeProduct && r.ingredient_id === newLine.ingredient_id)),
        { id: 'tmp', product_id: recipeProduct, ingredient_id: newLine.ingredient_id, qty },
      ])
      setNewLine(null)
    } catch {
      setError(lang === 'vi' ? 'Không lưu được công thức.' : 'Could not save recipe.')
    }
  }

  const removeLine = async (line: RecipeLine) => {
    try {
      await deleteRecipeLine(line.product_id, line.ingredient_id)
      setRecipes((rs) => rs.filter((r) => !(r.product_id === line.product_id && r.ingredient_id === line.ingredient_id)))
    } catch {
      setError(lang === 'vi' ? 'Không xóa được dòng công thức.' : 'Could not delete recipe line.')
    }
  }

  const ingName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? '—'
  const ingUnit = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? ''
  const selectedProduct = products.find((p) => p.id === recipeProduct)
  const productLines = recipes.filter((r) => r.product_id === recipeProduct)
  const availableToAdd = ingredients.filter((i) => !productLines.some((l) => l.ingredient_id === i.id))
  const usage = useMemo(() => {
    const total = productLines.reduce((s, l) => s + l.qty, 0) || 1
    return productLines.map((l) => ({ ...l, pct: (l.qty / total) * 100 }))
  }, [productLines])

  return (
    <div className="h-full overflow-y-auto p-4 pb-10 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <Boxes size={21} />
          </span>
          <div>
            <h1 className="text-base font-bold text-ink">{t('inventory')}</h1>
            <p className="text-xs text-stone-400">
              {ingredients.length} {lang === 'vi' ? 'nguyên liệu' : 'ingredients'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full bg-stone-100 p-1">
            <button
              onClick={() => setTab('stock')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'stock' ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink'
              }`}
            >
              {t('inventory')}
            </button>
            <button
              onClick={() => setTab('recipes')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'recipes' ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink'
              }`}
            >
              {t('recipes')}
            </button>
          </div>
          {tab === 'stock' && (
            <button
              onClick={() => setForm({ ...EMPTY_ING })}
              className="flex items-center gap-1.5 rounded-xl bg-brand-800 px-4 py-2 text-xs font-semibold text-amber-50 shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              <Plus size={15} /> {t('addIngredient')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {/* Low stock banner */}
      {tab === 'stock' && lowStock.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-warn">
            <TriangleAlert size={15} /> {t('lowStockAlert')} ({lowStock.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lowStock.map((i) => (
              <span key={i.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-warn shadow-sm">
                {i.name}: {fmtQty(i.stock)}/{fmtQty(i.min_stock)} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : tab === 'stock' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ingredients.map((ing) => {
            const low = ing.stock <= ing.min_stock
            const pct = ing.min_stock > 0 ? Math.min(100, (ing.stock / (ing.min_stock * 3)) * 100) : 100
            return (
              <div key={ing.id} className={`panel p-4 ${low ? 'border-amber-200 bg-amber-50/40' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{ing.name}</p>
                    <p className="mt-0.5 text-[11px] text-stone-400">{ing.unit}</p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      low ? 'bg-amber-100 text-warn' : 'bg-emerald-50 text-ready'
                    }`}
                  >
                    {low ? <TriangleAlert size={10} /> : <CircleCheck size={10} />}
                    {low ? t('lowStock') : t('stockOk')}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <p className="text-[19px] font-bold tabular-nums text-ink">{fmtQty(ing.stock)}</p>
                  <p className="text-xs text-stone-400">/ {fmtQty(ing.min_stock)} {ing.unit} ({t('minStock')})</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full transition-all ${low ? 'bg-warn' : 'bg-ready'}`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
                <div className="mt-3.5 flex items-center justify-end gap-1">
                  <button
                    onClick={() => setRestockFor({ ing, amount: '' })}
                    className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
                  >
                    <PackagePlus size={12} /> {t('restock')}
                  </button>
                  <button
                    onClick={() =>
                      setForm({
                        id: ing.id, name: ing.name, unit: ing.unit,
                        stock: String(ing.stock), min_stock: String(ing.min_stock),
                      })
                    }
                    className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => removeIngredient(ing)}
                    className="rounded-lg p-1.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Recipes tab */
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel max-h-[70vh] overflow-y-auto p-3 lg:col-span-1">
            <p className="sticky top-0 mb-2 bg-white px-1 pb-1.5 text-xs font-bold text-stone-400">
              {lang === 'vi' ? 'Chọn món' : 'Pick a product'} ({products.length})
            </p>
            <ul className="flex flex-col gap-0.5">
              {products.map((p) => {
                const has = recipes.some((r) => r.product_id === p.id)
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setRecipeProduct(p.id)
                        setNewLine(null)
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                        recipeProduct === p.id ? 'bg-brand-800 text-amber-50' : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      {has && <Link2 size={13} className={recipeProduct === p.id ? 'text-amber-200' : 'text-ready'} />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="panel p-5 lg:col-span-2">
            {!selectedProduct ? (
              <div className="flex h-56 flex-col items-center justify-center gap-2 text-stone-300">
                <CookingPot size={36} strokeWidth={1.5} />
                <p className="text-[13px] text-stone-400">{lang === 'vi' ? 'Chọn một món bên trái' : 'Pick a product on the left'}</p>
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">
                    {t('recipeFor')} «{selectedProduct.name}»
                  </h2>
                </div>
                {productLines.length === 0 ? (
                  <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-warn">{t('noRecipe')}</p>
                ) : (
                  <ul className="mb-4 flex flex-col gap-2">
                    {usage.map((l) => (
                      <li key={l.ingredient_id} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-[13px] font-medium text-ink">{ingName(l.ingredient_id)}</span>
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-brand-400" style={{ width: `${l.pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                          {fmtQty(l.qty)} {ingUnit(l.ingredient_id)}
                        </span>
                        <button
                          onClick={() => removeLine(l)}
                          className="rounded-lg p-1.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-danger"
                        >
                          <Unlink size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {newLine ? (
                  <div className="flex items-end gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-medium text-stone-500">{t('addIngredientToRecipe')}</span>
                      <select
                        autoFocus
                        value={newLine.ingredient_id}
                        onChange={(e) => setNewLine({ ...newLine, ingredient_id: e.target.value })}
                        className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-400"
                      >
                        <option value="">—</option>
                        {availableToAdd.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="w-24">
                      <span className="mb-1 block text-[11px] font-medium text-stone-500">{t('qtyPerCup')}</span>
                      <input
                        inputMode="decimal"
                        value={newLine.qty}
                        onChange={(e) => setNewLine({ ...newLine, qty: e.target.value.replace(/[^0-9.]/g, '') })}
                        placeholder="18"
                        className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs tabular-nums outline-none focus:border-brand-400"
                      />
                    </label>
                    <button
                      onClick={addLine}
                      disabled={!newLine.ingredient_id || !newLine.qty}
                      className="flex h-[34px] items-center gap-1 rounded-lg bg-brand-800 px-3 text-xs font-semibold text-amber-50 transition-colors hover:bg-brand-700 disabled:opacity-40"
                    >
                      <Check size={13} /> {t('saveRecipe')}
                    </button>
                    <button
                      onClick={() => setNewLine(null)}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewLine({ ingredient_id: '', qty: '' })}
                    disabled={availableToAdd.length === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-40"
                  >
                    <Plus size={14} /> {t('addIngredientToRecipe')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Ingredient form modal */}
      {form && (
        <div className="modal-overlay">
          <div className="modal-card sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">
                {form.id ? t('editIngredient') : t('addIngredient')}
              </h3>
              <button onClick={() => setForm(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X size={17} />
              </button>
            </div>
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('ingredientName')}</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <div className="mb-3.5 grid grid-cols-3 gap-2.5">
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('ingredientUnit')}</span>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((f) => (f ? { ...f, unit: e.target.value as Ingredient['unit'] } : f))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('currentStock')}</span>
                <input
                  inputMode="decimal"
                  value={form.stock}
                  onChange={(e) => setForm((f) => (f ? { ...f, stock: e.target.value.replace(/[^0-9.]/g, '') } : f))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('minStock')}</span>
                <input
                  inputMode="decimal"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => (f ? { ...f, min_stock: e.target.value.replace(/[^0-9.]/g, '') } : f))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white"
                />
              </label>
            </div>
            <button
              onClick={saveForm}
              disabled={saving || !form.name.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {form.id ? t('saveChanges') : t('addIngredient')}
            </button>
          </div>
        </div>
      )}

      {/* Restock modal */}
      {restockFor && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xs">
            <h3 className="mb-1 text-base font-bold text-ink">{t('restock')}</h3>
            <p className="mb-4 text-[13px] text-stone-400">
              {restockFor.ing.name} · {t('currentStock')} {fmtQty(restockFor.ing.stock)} {restockFor.ing.unit}
            </p>
            <input
              autoFocus
              inputMode="decimal"
              value={restockFor.amount}
              onChange={(e) => setRestockFor({ ...restockFor, amount: e.target.value.replace(/[^0-9.]/g, '') })}
              placeholder={t('restockAmount')}
              className="mb-4 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
            <button
              onClick={doRestock}
              disabled={saving || !(Number(restockFor.amount) > 0)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />} {t('restock')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
