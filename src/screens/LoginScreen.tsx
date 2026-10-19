import { useState } from 'react'
import { Coffee, Eye, EyeOff, Loader2, ArrowRight, LockKeyhole } from 'lucide-react'
import { useI18n } from '../i18n'
import { signIn, type StaffProfile } from '../lib/auth'

const DEMO_ACCOUNTS = [
  { email: 'owner@cafepos.vn', label: 'Chủ quán · Owner' },
  { email: 'cashier@cafepos.vn', label: 'Thu ngân · Cashier' },
  { email: 'barista@cafepos.vn', label: 'Pha chế · Barista' },
]

export default function LoginScreen({ onLogin }: { onLogin: (profile: StaffProfile) => void }) {
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState('owner@cafepos.vn')
  const [password, setPassword] = useState('123456')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = await signIn(email.trim(), password)
      onLogin(profile.profile)
    } catch {
      setError(lang === 'vi' ? 'Sai tài khoản hoặc mật khẩu.' : 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-brand-950 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-700/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />

      <button
        onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        className="absolute right-5 top-5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-amber-50 transition-colors hover:bg-white/20"
      >
        {lang === 'vi' ? 'EN' : 'VI'}
      </button>

      <div className="relative w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-amber-100 ring-1 ring-white/20 backdrop-blur">
            <Coffee size={28} strokeWidth={2} />
          </span>
          <div className="text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-white">{t('loginTitle')}</h1>
            <p className="mt-0.5 text-[13px] text-white/50">{t('loginSubtitle')}</p>
          </div>
        </div>

        <form
          className="flex flex-col gap-3.5 rounded-3xl bg-white p-7 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('username')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-stone-600">{t('password')}</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-11 text-sm outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="group mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-brand-800 py-3 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <>
                {t('signIn')}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <div className="mt-1 rounded-xl bg-stone-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone-400">
              <LockKeyhole size={11} /> {lang === 'vi' ? 'Tài khoản thử (mật khẩu 123456)' : 'Demo accounts (password 123456)'}
            </p>
            <div className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email)
                    setPassword('123456')
                  }}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    email === a.email ? 'bg-brand-100/70 text-brand-800' : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <span className="font-medium">{a.label}</span>
                  <span className="text-stone-400">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
