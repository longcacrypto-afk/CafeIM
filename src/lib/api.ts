import { supabase } from './supabase'
import type { Role } from './auth'
import type { AppModuleRow } from './modules'

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  price: number
  sold_out: boolean
  sort_order: number
}

export interface ProductSize {
  id: string
  product_id: string
  size: 'S' | 'M' | 'L'
  price: number
}

export interface Topping {
  id: string
  name: string
  price: number
  active: boolean
}

export interface Ingredient {
  id: string
  name: string
  unit: 'g' | 'ml' | 'pcs'
  stock: number
  min_stock: number
}

export interface RecipeLine {
  id: string
  product_id: string
  ingredient_id: string
  qty: number
}

export interface CafeTable {
  id: string
  name: string
  seats: number
  area: string
  occupied: boolean
  sort_order: number
  photo_url: string | null
  note: string | null
}

export type DiscountType = 'none' | 'amount' | 'percent'

export interface Order {
  id: string
  table_name: string | null
  status: 'pending' | 'brewing' | 'ready' | 'completed' | 'cancelled'
  total: number
  payment_method: string | null
  note: string | null
  source: 'pos' | 'qr'
  customer_status: 'new' | 'confirmed' | 'served' | null
  staff_id: string | null
  staff_name: string | null
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  created_at: string
  completed_at: string | null
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  size: string
  size_price: number | null
  unit_price: number
  quantity: number
  note: string | null
  toppings: { name: string; price: number }[]
  status: 'pending' | 'brewing' | 'ready' | 'cancelled'
  created_at: string
}

export interface OrderReportRow {
  order_id: string
  table_name: string | null
  payment_method: string | null
  total: number
  discount_amount: number
  item_count: number
  item_summary: string
  completed_at: string
  staff_name: string | null
}

export interface Shift {
  id: string
  staff_id: string
  staff_name: string
  opening_cash: number
  closing_cash: number | null
  counted_cash: number | null
  difference: number | null
  revenue_cash: number
  revenue_transfer: number
  revenue_card: number
  order_count: number
  item_count: number
  opened_at: string
  closed_at: string | null
}

export interface Expense {
  id: string
  shift_id: string | null
  staff_id: string | null
  title: string
  amount: number
  note: string | null
  created_at: string
}

export interface CafeSettings {
  name: string
  address: string
  hotline: string
  receipt_footer: string
  telegram_chat_ids: string[]
}

// ---------- shifts ----------

export async function fetchMyOpenShift() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('staff_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .is('closed_at', null)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as Shift | null
}

export async function fetchShiftsSince(iso: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('opened_at', iso)
    .order('opened_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Shift[]
}

export async function openShift(openingCash: number) {
  const { data, error } = await supabase.rpc('open_shift_insert', { p_opening_cash: openingCash })
  if (error) throw error
  return data as unknown as Shift
}

export async function closeShiftRpc(countedCash: number) {
  const { data, error } = await supabase.rpc('close_shift', { p_counted_cash: countedCash })
  if (error) throw error
  return data as unknown as Shift
}

// ---------- expenses ----------

export async function fetchExpensesSince(iso: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('created_at', iso)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Expense[]
}

export async function insertExpense(input: { title: string; amount: number; shift_id: string | null; note?: string }) {
  const user = (await supabase.auth.getUser()).data.user
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, staff_id: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Expense
}

// ---------- settings ----------

export async function fetchSettings() {
  const { data, error } = await supabase.from('cafe_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return (data ?? null) as (CafeSettings & { id: number }) | null
}

export async function updateSettings(patch: Partial<CafeSettings>) {
  const { data, error } = await supabase.from('cafe_settings').update(patch).eq('id', 1).select().single()
  if (error) throw error
  return data as CafeSettings & { id: number }
}

// ---------- staff management (owner) ----------

export async function inviteStaff(email: string, password: string, name: string, role: Role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  })
  if (error) throw error
  return data
}

export async function fetchStaff() {
  const { data, error } = await supabase.from('staff').select('*').order('name')
  if (error) throw error
  return (data ?? []) as { id: string; name: string; role: Role; created_at: string }[]
}


// ---------- catalog reads ----------

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function fetchProductSizes() {
  const { data, error } = await supabase.from('product_sizes').select('*')
  if (error) throw error
  return (data ?? []) as ProductSize[]
}

export async function fetchToppings() {
  const { data, error } = await supabase.from('toppings').select('*').eq('active', true).order('name')
  if (error) throw error
  return (data ?? []) as Topping[]
}

export async function fetchTables() {
  const { data, error } = await supabase.from('tables').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as CafeTable[]
}

// ---------- menu management (owner) ----------

export async function insertProduct(input: { category_id: string; name: string; price: number }) {
  const { data, error } = await supabase.from('products').insert(input).select().single()
  if (error) throw error
  const product = data as Product
  await supabase.from('product_sizes').insert([
    { product_id: product.id, size: 'S', price: Math.max(0, product.price - 5000) },
    { product_id: product.id, size: 'M', price: product.price },
    { product_id: product.id, size: 'L', price: product.price + 8000 },
  ])
  return product
}

export async function updateProduct(id: string, patch: Partial<Pick<Product, 'name' | 'price' | 'sold_out' | 'category_id'>>) {
  const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function insertCategory(name: string, sortOrder: number) {
  const { data, error } = await supabase.from('categories').insert({ name, sort_order: sortOrder }).select().single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ---------- tables management (owner) ----------

export async function insertTable(input: { name: string; seats: number; area: string; sort_order: number }) {
  const { data, error } = await supabase.from('tables').insert(input).select().single()
  if (error) throw error
  return data as CafeTable
}

export async function updateTable(id: string, patch: Partial<Pick<CafeTable, 'name' | 'seats' | 'area' | 'occupied' | 'photo_url' | 'note'>>) {
  const { data, error } = await supabase.from('tables').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as CafeTable
}

export async function deleteTable(id: string) {
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) throw error
}

export async function uploadTablePhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `tables/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('table-photos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('table-photos').getPublicUrl(path)
  return data.publicUrl
}

// ---------- inventory (owner) ----------

export async function fetchIngredients() {
  const { data, error } = await supabase.from('ingredients').select('*').order('name')
  if (error) throw error
  return (data ?? []) as Ingredient[]
}

export async function fetchRecipeLines() {
  const { data, error } = await supabase.from('product_ingredients').select('*')
  if (error) throw error
  return (data ?? []) as RecipeLine[]
}

export async function insertIngredient(input: { name: string; unit: Ingredient['unit']; stock: number; min_stock: number }) {
  const { data, error } = await supabase.from('ingredients').insert(input).select().single()
  if (error) throw error
  return data as Ingredient
}

export async function updateIngredient(id: string, patch: Partial<Pick<Ingredient, 'name' | 'stock' | 'min_stock' | 'unit'>>) {
  const { data, error } = await supabase.from('ingredients').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Ingredient
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw error
}

export async function restockIngredient(id: string, amount: number) {
  const { data, error } = await supabase.rpc('restock_ingredient', { p_id: id, amount })
  if (error) throw error
  return data as Ingredient
}

export async function saveRecipeLine(productId: string, ingredientId: string, qty: number) {
  const { error } = await supabase
    .from('product_ingredients')
    .upsert({ product_id: productId, ingredient_id: ingredientId, qty }, { onConflict: 'product_id,ingredient_id' })
  if (error) throw error
}

export async function deleteRecipeLine(productId: string, ingredientId: string) {
  const { error } = await supabase
    .from('product_ingredients')
    .delete()
    .eq('product_id', productId)
    .eq('ingredient_id', ingredientId)
  if (error) throw error
}

// ---------- orders ----------

export async function fetchOpenOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['pending', 'brewing', 'ready'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as (Order & { order_items: OrderItemRow[] })[]
}

export async function createOrder(payload: {
  table_name: string | null
  total: number
  payment_method: string | null
  note: string | null
  discount_type?: DiscountType
  discount_value?: number
  discount_amount?: number
  items: {
    product_id: string
    product_name: string
    size: string
    size_price: number
    unit_price: number
    quantity: number
    note: string | null
    toppings: { name: string; price: number }[]
  }[]
}) {
  const user = (await supabase.auth.getUser()).data.user
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      table_name: payload.table_name,
      total: payload.total,
      payment_method: payload.payment_method,
      note: payload.note,
      status: payload.payment_method ? 'completed' : 'pending',
      completed_at: payload.payment_method ? new Date().toISOString() : null,
      staff_id: user?.id ?? null,
      staff_name: user?.user_metadata?.name ?? null,
      discount_type: payload.discount_type ?? 'none',
      discount_value: payload.discount_value ?? 0,
      discount_amount: payload.discount_amount ?? 0,
    })
    .select()
    .single()
  if (orderError) throw orderError

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(payload.items.map((i) => ({ ...i, order_id: order.id })))
  if (itemsError) throw itemsError

  return order as Order
}

export async function fetchUnpaidOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['pending', 'brewing', 'ready'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as (Order & { order_items: OrderItemRow[] })[]
}

export async function fetchTodayCompletedOrders() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('status', 'completed')
    .gte('completed_at', start.toISOString())
    .order('completed_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (Order & { order_items: OrderItemRow[] })[]
}

export async function payOrder(orderId: string, paymentMethod: string, discount?: { type: DiscountType; value: number; amount: number }) {
  const patch: Record<string, unknown> = {
    status: 'completed',
    payment_method: paymentMethod,
    completed_at: new Date().toISOString(),
    staff_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    staff_name: (await supabase.auth.getUser()).data.user?.user_metadata?.name ?? null,
  }
  if (discount) {
    patch.discount_type = discount.type
    patch.discount_value = discount.value
    patch.discount_amount = discount.amount
  }
  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .in('status', ['pending', 'brewing', 'ready'])
    .select()
    .single()
  if (error) throw error
  return data as Order
}

export async function addItemsToOrder(
  orderId: string,
  items: {
    product_id: string
    product_name: string
    size: string
    size_price: number
    unit_price: number
    quantity: number
    note: string | null
    toppings: { name: string; price: number }[]
  }[],
) {
  const { data, error } = await supabase.rpc('add_items_to_order', {
    p_order_id: orderId,
    p_items: JSON.stringify(items),
  })
  if (error) throw error
  return data as number
}

export async function completeOrder(id: string, paymentMethod: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'completed', payment_method: paymentMethod, completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- cancel flow ----------

export async function requestCancelItem(itemId: string, reason: string) {
  const user = (await supabase.auth.getUser()).data.user
  const { error } = await supabase
    .from('order_items')
    .update({ status: 'cancel_requested', cancel_reason: reason, cancel_requested_by: user?.id ?? null })
    .eq('id', itemId)
  if (error) throw error
}

export async function approveCancelItem(itemId: string, approve: boolean) {
  const { error } = await supabase.rpc('approve_cancel', { p_item_id: itemId, p_approve: approve })
  if (error) throw error
}

export async function fetchCancelRequests() {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, order:orders(table_name, status)')
    .eq('status', 'cancel_requested')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (OrderItemRow & { order: { table_name: string | null; status: string } | null })[]
}

// ---------- merge / move orders ----------

export async function moveOrder(orderId: string, targetTable: string) {
  const { error } = await supabase.rpc('move_order', { p_order_id: orderId, p_target_table: targetTable })
  if (error) throw error
}

export async function moveOrderItem(itemId: string, targetOrderId: string) {
  const { error } = await supabase.rpc('move_order_item', { p_item_id: itemId, p_target_order_id: targetOrderId })
  if (error) throw error
}

// ---------- QR customer ordering (anon) ----------

export async function fetchPublicMenu() {
  const [cats, prods, szs, tops] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('products').select('*').order('sort_order'),
    supabase.from('product_sizes').select('*'),
    supabase.from('toppings').select('*').eq('active', true).order('name'),
  ])
  if (cats.error) throw cats.error
  if (prods.error) throw prods.error
  if (szs.error) throw szs.error
  if (tops.error) throw tops.error
  return {
    categories: (cats.data ?? []) as Category[],
    products: (prods.data ?? []) as Product[],
    sizes: (szs.data ?? []) as ProductSize[],
    toppings: (tops.data ?? []) as Topping[],
  }
}

export async function submitCustomerOrder(payload: {
  table_name: string
  total: number
  items: {
    product_id: string
    product_name: string
    size: string
    size_price: number
    unit_price: number
    quantity: number
    note: string | null
    toppings: { name: string; price: number }[]
  }[]
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert({ table_name: payload.table_name, total: payload.total, source: 'qr', status: 'pending' })
    .select()
    .single()
  if (error) throw error
  const order = data as Order
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(payload.items.map((i) => ({ ...i, order_id: order.id })))
  if (itemsError) throw itemsError
  return order
}

export async function confirmQrOrder(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ customer_status: 'confirmed' })
    .eq('id', orderId)
    .eq('source', 'qr')
  if (error) throw error
}

// ---------- reports ----------

export async function fetchCompletedOrdersSince(iso: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('status', 'completed')
    .gte('completed_at', iso)
    .order('completed_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as (Order & { order_items: OrderItemRow[] })[]
}

export async function fetchOrderReport(days: number) {
  const { data, error } = await supabase.rpc('order_report', { days })
  if (error) throw error
  return (data ?? []) as OrderReportRow[]
}

export type { Role }

// ---------- advanced module system ----------

export async function fetchAppModules(): Promise<AppModuleRow[]> {
  const { data, error } = await supabase.from('app_modules').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as AppModuleRow[]
}

export async function toggleAppModule(id: string, enabled: boolean): Promise<AppModuleRow> {
  const { data, error } = await supabase
    .from('app_modules')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as AppModuleRow
}

export type { AppModuleRow }

export async function fetchOrderForReprint(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return data as (Order & { order_items: OrderItemRow[] }) | null
}
