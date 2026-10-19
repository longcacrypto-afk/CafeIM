export interface AppModuleRow {
  id: string
  label_vi: string
  label_en: string
  hint_vi: string
  hint_en: string
  sort_order: number
  enabled: boolean
  updated_at: string
}

// Stable ids mirrored by the DB seed in supabase/migrations/*_advanced_module_system.sql
export const KNOWN_MODULES = ['kitchen', 'qr', 'reports', 'inventory', 'menu', 'staff'] as const

export interface InstallProfile {
  id: 'small' | 'standard' | 'full'
  name_vi: string
  name_en: string
  desc_vi: string
  desc_en: string
  modules: string[]
}

export const INSTALL_PROFILES: InstallProfile[] = [
  {
    id: 'small',
    name_vi: 'Gói mini',
    name_en: 'Mini',
    desc_vi: '1 tài khoản order, doanh thu, báo cáo cơ bản — không cần kho, không nhân viên',
    desc_en: '1 ordering account, revenue, basic reports — no inventory, no staff',
    modules: [],
  },
  {
    id: 'standard',
    name_vi: 'Gói tiêu chuẩn',
    name_en: 'Standard',
    desc_vi: 'Thêm màn pha chế, gọi món QR, quản lý menu',
    desc_en: 'Adds kitchen display, QR ordering, menu management',
    modules: ['kitchen', 'qr', 'menu'],
  },
  {
    id: 'full',
    name_vi: 'Gói đầy đủ',
    name_en: 'Full',
    desc_vi: 'Tất cả: kho nguyên liệu, nhân viên, báo cáo nâng cao',
    desc_en: 'Everything: inventory, staff, advanced reports',
    modules: ['kitchen', 'qr', 'reports', 'inventory', 'menu', 'staff'],
  },
]

export function moduleLabel(m: AppModuleRow, lang: 'vi' | 'en') {
  return lang === 'vi' ? m.label_vi : m.label_en
}

export function moduleHint(m: AppModuleRow, lang: 'vi' | 'en') {
  return lang === 'vi' ? m.hint_vi : m.hint_en
}
