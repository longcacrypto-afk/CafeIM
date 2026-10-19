import { useEffect, useState } from 'react'
import {
  Coffee, LayoutGrid, ChefHat, ChartLine, Settings, LogOut, Store, Globe, ClipboardList,
  Loader2, Boxes, Armchair, Users, Clock, Menu as MenuIcon,
} from 'lucide-react'
import LoginScreen from './screens/LoginScreen'
import PosScreen, { type ReceiptData } from './screens/PosScreen'
import KitchenScreen from './screens/KitchenScreen'
import ReportsScreen from './screens/ReportsScreen'
import MenuScreen from './screens/MenuScreen'
import InventoryScreen from './screens/InventoryScreen'
import TablesScreen from './screens/TablesScreen'
import StaffScreen from './screens/StaffScreen'
import ShiftScreen from './screens/ShiftScreen'
import SettingsScreen from './screens/SettingsScreen'
import CustomerMenu from './screens/CustomerMenu'
import ReceiptModal from './screens/ReceiptModal'
import { useI18n } from './i18n'
import { signOut, type Role, type StaffProfile } from './lib/auth'
import { fetchAppModules } from './lib/api'
import type { AppModuleRow } from './lib/modules'

type Screen = 'pos' | 'kitchen' | 'reports' | 'menu' | 'settings' | 'inventory' | 'tables' | 'shift' | 'staff'

const ROLE_HOME: Record<Role, Screen> = { owner: 'reports', manager: 'reports', cashier: 'pos', barista: 'kitchen' }

function LanguageToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n()
  return (
    <button
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
        light
          ? 'border border-white/20 bg-white/10 text-amber-50 hover:bg-white/20'
          : 'border border-stone-200 bg-stone-50 text-stone-500 hover:border-brand-300 hover:text-brand-700'
      }`}
    >
      <Globe size={13} /> {lang.toUpperCase()}
    </button>
  )
}

function Shell({ profile }: { profile: StaffProfile }) {
  const [screen, setScreen] = useState<Screen>(ROLE_HOME[profile.role])
  const [signingOut, setSigningOut] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [modules, setModules] = useState<AppModuleRow[]>([])
  const { t } = useI18n()

  useEffect(() => {
    fetchAppModules()
      .then((ms) => setModules(ms.filter((m) => !m.enabled)))
      .catch(() => {})
  }, [])

  const disabledModules = new Set(modules.map((m) => m.id))

  const roleLabel =
    profile.role === 'owner' ? t('owner') : profile.role === 'manager' ? t('manager') : profile.role === 'cashier' ? t('navPos') : t('navKitchen')

  const canManage = profile.role === 'owner' || profile.role === 'manager'
  const nav = (
    [
      { id: 'pos', labelKey: 'navPos', icon: LayoutGrid },
      { id: 'kitchen', labelKey: 'navKitchen', icon: ChefHat },
      { id: 'reports', labelKey: 'navReports', icon: ChartLine },
      { id: 'shift', labelKey: 'navShift', icon: Clock },
      { id: 'tables', labelKey: 'tables', icon: Armchair },
      ...(canManage
        ? [
            { id: 'menu' as Screen, labelKey: 'navMenu' as const, icon: ClipboardList },
            { id: 'inventory' as Screen, labelKey: 'navInventory' as const, icon: Boxes },
            ...(profile.role === 'owner' ? [{ id: 'staff' as Screen, labelKey: 'navStaff' as const, icon: Users }] : []),
          ]
        : []),
      { id: 'settings', labelKey: 'navSettings', icon: Settings },
    ] as { id: Screen; labelKey: 'navPos' | 'navKitchen' | 'navReports' | 'navSettings' | 'navMenu' | 'navInventory' | 'navStaff' | 'navShift' | 'tables'; icon: typeof Coffee }[]
  ).filter((n) => {
    if (disabledModules.has(n.id)) return false
    if (profile.role === 'barista' && (n.id === 'pos' || n.id === 'reports' || n.id === 'menu' || n.id === 'inventory' || n.id === 'tables' || n.id === 'staff')) return false
    if (profile.role === 'cashier' && (n.id === 'menu' || n.id === 'inventory' || n.id === 'tables' || n.id === 'staff')) return false
    return true
  })

  const initial = profile.name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const mobileTabs = nav.slice(0, 4)

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile top header */}
      <header className="flex items-center justify-between gap-2 border-b border-stone-200/70 bg-white px-3 pt-safe pb-2 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors active:bg-stone-100"
          aria-label="Menu"
        >
          <MenuIcon size={19} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[14px] font-bold text-ink">{t(nav.find((n) => n.id === screen)?.labelKey ?? 'navPos')}</p>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageToggle />
          <button
            onClick={async () => {
              setSigningOut(true)
              await signOut()
              window.location.reload()
            }}
            disabled={signingOut}
            className="rounded-lg p-2 text-stone-400 transition-colors active:bg-stone-100 active:text-danger disabled:opacity-50"
          >
            {signingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex w-72 max-w-[82vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 pb-4 pt-safe">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
                <Coffee size={19} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold leading-tight text-ink">{profile.name}</p>
                <p className="truncate text-[11px] leading-tight text-stone-400">{roleLabel}</p>
              </div>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {nav.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setScreen(id)
                    setDrawerOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    screen === id ? 'bg-brand-50 text-brand-800' : 'text-stone-600 active:bg-stone-50'
                  }`}
                >
                  <Icon size={19} strokeWidth={screen === id ? 2.4 : 2} />
                  {t(labelKey)}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2 border-t border-stone-100 px-4 pb-safe pt-3">
              <Store size={15} className="shrink-0 text-stone-400" />
              <p className="truncate text-xs font-medium text-stone-600">Quán Sáng Tạo</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-stone-200/70 bg-white/95 backdrop-blur px-2 pt-1.5 pb-safe md:hidden">
        {mobileTabs.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
              screen === id ? 'text-brand-800' : 'text-stone-400 active:text-stone-600'
            }`}
          >
            <Icon size={21} strokeWidth={screen === id ? 2.4 : 2} />
            <span className="max-w-full truncate">{t(labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-[68px] flex-col items-center gap-1 border-r border-stone-200/70 bg-white py-4 md:flex md:w-60 md:items-stretch md:px-4">
        <div className="mb-6 flex items-center justify-center gap-2.5 md:justify-start md:px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-amber-50">
            <Coffee size={20} strokeWidth={2.2} />
          </span>
          <div className="hidden md:block">
            <p className="text-[15px] font-bold leading-tight text-ink">CaPhe POS</p>
            <p className="text-[11px] leading-tight text-stone-400">{roleLabel}</p>
          </div>
        </div>

        {nav.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`group relative flex flex-col items-center gap-1 rounded-xl py-3 text-[11px] font-medium transition-colors md:flex-row md:gap-3 md:px-3.5 md:py-2.5 md:text-sm ${
              screen === id ? 'bg-brand-50 text-brand-800' : 'text-stone-500 hover:bg-stone-50 hover:text-ink'
            }`}
          >
            <Icon size={20} strokeWidth={screen === id ? 2.4 : 2} />
            <span>{t(labelKey)}</span>
            {screen === id && (
              <span className="absolute -left-4 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-full bg-brand-600 md:block" />
            )}
          </button>
        ))}

        <div className="mt-auto flex w-full flex-col items-center gap-2 md:items-stretch">
          <div className="hidden justify-center md:flex"><LanguageToggle /></div>
          <div className="hidden items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 md:flex">
            <Store size={15} className="shrink-0 text-stone-400" />
            <p className="truncate text-xs font-medium text-stone-600">Quán Sáng Tạo</p>
          </div>
          <div className="flex items-center gap-2.5 md:px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-800">
              {initial}
            </span>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-[13px] font-semibold leading-tight text-ink">{profile.name}</p>
              <p className="truncate text-[11px] leading-tight text-stone-400">{roleLabel}</p>
            </div>
            <button
              onClick={async () => {
                setSigningOut(true)
                await signOut()
                window.location.reload()
              }}
              disabled={signingOut}
              className="hidden rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-danger disabled:opacity-50 md:block"
            >
              {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden pb-16 md:pb-0">
        {screen === 'pos' && (
          <PosScreen cashierName={profile.name} onPrintReceipt={setReceipt} />
        )}
        {screen === 'kitchen' && <KitchenScreen role={profile.role} />}
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'menu' && canManage && <MenuScreen />}
        {screen === 'inventory' && canManage && <InventoryScreen />}
        {screen === 'tables' && canManage && <TablesScreen />}
        {screen === 'shift' && <ShiftScreen />}
        {screen === 'staff' && profile.role === 'owner' && <StaffScreen />}
        {screen === 'settings' && (
          <SettingsScreen isAdmin={profile.role === 'owner'} />
        )}
      </main>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}
export default function App() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)

  useEffect(() => {
    document.documentElement.lang = 'vi'
  }, [])

  const path = window.location.pathname
  if (path === '/menu' || path === '/order') return <CustomerMenu />

  if (!profile) return <LoginScreen onLogin={setProfile} />
  return <Shell key={profile.id} profile={profile} />
}
