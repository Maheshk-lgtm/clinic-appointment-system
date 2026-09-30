import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/Primitives'

export function LoginPage() {
  const { login, profile, firebaseUser, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && firebaseUser && profile?.active) {
    return <Navigate to={`/${profile.role}`} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch {
      setError('Incorrect email or password. Please verify your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-dental-pattern relative flex items-center justify-center px-3.5 sm:px-4 py-6 sm:py-12 font-body overflow-x-hidden">
      {/* Ambient background glowing orbs in dental blue and sky */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 sm:w-[32rem] sm:h-[32rem] rounded-full bg-gradient-to-br from-sky-300/35 via-blue-200/25 to-transparent blur-3xl pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 sm:w-[32rem] sm:h-[32rem] rounded-full bg-gradient-to-tl from-blue-400/30 via-sky-200/20 to-transparent blur-3xl pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full bg-white/40 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Decorative floating dental tooth watermarks in background */}
      <div className="absolute top-12 left-12 hidden md:block opacity-20 pointer-events-none select-none text-clinic-600 animate-float">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C7.5 2 4 5 4 10c0 5 2.5 9 4.5 13 1.5-1 2.5-3 3.5-3s2 2 3.5 3c2-4 4.5-8 4.5-13 0-5-3.5-8-8-8z" />
          <circle cx="9" cy="8" r="1" fill="currentColor" />
          <circle cx="15" cy="8" r="1" fill="currentColor" />
        </svg>
      </div>
      <div className="absolute bottom-12 right-12 hidden md:block opacity-20 pointer-events-none select-none text-sky-600 animate-float" style={{ animationDelay: '2.5s' }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C7.5 2 4 5 4 10c0 5 2.5 9 4.5 13 1.5-1 2.5-3 3.5-3s2 2 3.5 3c2-4 4.5-8 4.5-13 0-5-3.5-8-8-8z" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="relative inline-block mx-auto mb-3.5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-clinic-500 via-sky-600 to-clinic-700 text-white flex items-center justify-center shadow-xl shadow-clinic-500/30 ring-4 ring-white/90 animate-float">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 6 2 9 .4 2.2 1.5 4 4 4s3.6-1.8 4-4c.5-3 2-6 2-9 0-3.5-2.5-6-6-6z" />
                <path d="M10 9c.5.5 1.5.5 2 0s1.5-.5 2 0" />
              </svg>
            </div>
            {/* Sparkle badge */}
            <span
              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border-2 border-sky-400 text-sky-600 flex items-center justify-center shadow-sm"
              title="Dental Care Platform"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            BMD
          </h1>
          <p className="text-sm sm:text-base font-semibold text-clinic-600 tracking-wide mt-1">
            BookMyDentist
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-clinic-200/80 text-xs font-medium text-clinic-800 shadow-xs mt-2.5 backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-clinic-500 animate-pulse" />
            Dental Practice & Appointment Portal
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl shadow-2xl shadow-clinic-900/10 p-5 sm:p-8 space-y-4 sm:space-y-5 relative ring-1 ring-clinic-100/90">
          <div className="border-b border-slate-100 pb-3 text-center sm:text-left">
            <h2 className="text-base font-bold text-ink">Sign In to Your Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access the clinic scheduler
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-clinic-500 focus:ring-2 focus:ring-clinic-500/20 focus:bg-white transition"
                  placeholder="name@clinic.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-clinic-500 focus:ring-2 focus:ring-clinic-500/20 focus:bg-white transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-clinic-600 transition p-1 select-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50/90 p-3 rounded-xl border border-red-200 flex items-start gap-2 animate-fade-in">
                <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full justify-center py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-clinic-600 via-sky-600 to-blue-600 hover:from-clinic-700 hover:via-sky-700 hover:to-blue-700 text-white shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 transition active:scale-[0.99] border-0"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Sign In to Clinic <span>→</span>
                </span>
              )}
            </Button>
          </form>

          {/* Dental Trust & Feature Badges */}
          <div className="pt-3 border-t border-slate-100/90 flex items-center justify-around text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-clinic-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 6 2 9 .4 2.2 1.5 4 4 4s3.6-1.8 4-4c.5-3 2-6 2-9 0-3.5-2.5-6-6-6z" />
              </svg>
              Advanced Care
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              24/7 Scheduling
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure Access
            </span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-slate-500 text-center font-medium">
          Accounts are managed by clinic administrators.
        </p>
      </div>
    </div>
  )
}
