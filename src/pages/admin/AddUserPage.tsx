import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { createStaffUser } from '@/services/userService'
import { createDoctor, getDoctorForUser, linkDoctorToUser } from '@/services/doctorService'
import { auth } from '@/firebase/config'
import type { Role } from '@/types'
import { Button, Card } from '@/components/Primitives'

const ROLE_OPTIONS: { role: Role; label: string; badge: string; desc: string; icon: React.ReactNode }[] = [
  {
    role: 'doctor',
    label: 'Doctor',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    desc: 'Can view daily appointments, accept or decline patient requests, and manage consultations.',
    icon: (
      <svg className="w-5 h-5 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  {
    role: 'receptionist',
    label: 'Receptionist',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    desc: 'Can book patient appointments, reschedule slots, and manage clinic front-desk operations.',
    icon: (
      <svg className="w-5 h-5 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    role: 'admin',
    label: 'Administrator',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    desc: 'Full administrative access: manage staff accounts, doctors, schedules, reports, and settings.',
    icon: (
      <svg className="w-5 h-5 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  }
]

function generateSecurePassword(): string {
  const words = ['Clinic', 'Health', 'Smile', 'Care', 'Dental', 'Medic']
  const randomWord = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  const symbols = ['!', '@', '#', '$', '%']
  const sym = symbols[Math.floor(Math.random() * symbols.length)]
  return `${randomWord}@${num}${sym}`
}

export function AddUserPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { show } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>('doctor')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({})
  const [copied, setCopied] = useState(false)

  // Success state holding newly created user credentials
  const [createdUser, setCreatedUser] = useState<{
    uid: string
    displayName: string
    email: string
    password: string
    role: Role
  } | null>(null)

  function handleGeneratePassword() {
    const pw = generateSecurePassword()
    setPassword(pw)
    setShowPassword(true)
    if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
    show('Generated strong password.', 'info')
  }

  function validate() {
    const next: typeof errors = {}
    if (!displayName.trim()) next.displayName = 'Full name is required.'
    if (!email.trim()) {
      next.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address (e.g. name@clinic.com).'
    }
    if (!password) {
      next.password = 'Temporary password is required.'
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters long.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    const creatorId = profile?.uid || auth.currentUser?.uid || 'admin'
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = displayName.trim()

    try {
      const res = await createStaffUser({
        email: cleanEmail,
        password,
        displayName: cleanName,
        role,
        createdBy: creatorId
      })

      // If creating a doctor user, automatically initialize and link doctor profile
      if (role === 'doctor') {
        try {
          const existingDoc = await getDoctorForUser(res.uid, cleanEmail)
          if (!existingDoc) {
            await createDoctor({
              name: cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`,
              userId: res.uid,
              specializationId: '',
              specializationName: 'General Dentistry',
              qualification: 'BDS / DDS',
              phone: '',
              email: cleanEmail,
              consultationMinutes: 30,
              workingHours: [
                { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
                { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
                { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
                { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
                { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
                { day: 'sat', enabled: false, start: '09:00', end: '17:00' },
                { day: 'sun', enabled: false, start: '09:00', end: '17:00' }
              ],
              exceptions: [],
              active: true
            })
          } else {
            await linkDoctorToUser(res.uid, existingDoc.id)
          }
        } catch (docErr) {
          console.warn('[AddUserPage] Could not auto-link doctor profile:', docErr)
        }
      }

      show(`Account successfully created for ${cleanName}!`, 'success')
      setCreatedUser({
        uid: res.uid,
        displayName: cleanName,
        email: cleanEmail,
        password,
        role
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create account.'
      if (message.toLowerCase().includes('already exists') || (message.toLowerCase().includes('email') && message.toLowerCase().includes('exist'))) {
        setErrors({ email: message })
      } else {
        show(message, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function copyCredentials() {
    if (!createdUser) return
    const text = [
      `BMD (BookMyDentist) - Account Credentials`,
      `Name: ${createdUser.displayName}`,
      `Email: ${createdUser.email}`,
      `Role: ${createdUser.role.toUpperCase()}`,
      `Temporary Password: ${createdUser.password}`,
      `Sign In URL: ${window.location.origin}/login`
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      show('Credentials copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function resetForm() {
    setDisplayName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setRole('doctor')
    setErrors({})
    setCreatedUser(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/admin/users" className="hover:text-clinic-700 transition">
            All Users
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Add New User</span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink">Add User Account</h1>
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Create login credentials for a new doctor, receptionist, or clinic administrator.
        </p>
      </div>

      {/* SUCCESS SCREEN */}
      {createdUser ? (
        <Card className="p-6 border-emerald-200 bg-emerald-50/30">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink">User Account Created!</h2>
            <p className="text-sm text-slate-600 mt-1">
              The user profile and Firebase authentication record have been saved.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Full Name</span>
              <span className="font-semibold text-ink">{createdUser.displayName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Email Address</span>
              <span className="font-mono text-ink font-medium">{createdUser.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Role Assigned</span>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-clinic-50 text-clinic-700 border border-clinic-200">
                {createdUser.role}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 text-sm">
              <span className="text-slate-500">Temporary Password</span>
              <span className="font-mono font-bold text-clinic-800 bg-slate-100 px-2 py-1 rounded">
                {createdUser.password}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Button
              className="w-full justify-center text-sm py-2.5 shadow-sm flex items-center gap-1.5"
              onClick={copyCredentials}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Credentials Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Login Credentials
                </>
              )}
            </Button>

            {createdUser.role === 'doctor' && (
              <div className="bg-clinic-50 border border-clinic-200 rounded-lg p-3 text-xs text-clinic-800 flex items-center justify-between">
                <span>Want to set up their consultation duration and working hours?</span>
                <Link
                  to="/admin/doctors"
                  className="font-semibold underline ml-2 shrink-0 hover:text-clinic-900"
                >
                  Configure Doctor Profile →
                </Link>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                onClick={resetForm}
              >
                + Add Another User
              </Button>
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => navigate('/admin/users')}
              >
                View in All Users
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* CREATION FORM */
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }))
                }}
                placeholder="e.g. Dr. Rajesh Kumar or Sneha Sharma"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  errors.displayName
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-clinic-500 focus:ring-clinic-200'
                }`}
                disabled={submitting}
                autoFocus
              />
              {errors.displayName && <p className="text-xs text-red-600 mt-1">{errors.displayName}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                placeholder="e.g. rajesh@clinic.test"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-clinic-500 focus:ring-clinic-200'
                }`}
                disabled={submitting}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs text-clinic-700 hover:text-clinic-900 font-medium flex items-center gap-1 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                  }}
                  placeholder="Min. 8 characters (or click Generate)"
                  className={`w-full rounded-lg border pl-3.5 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition ${
                    errors.password
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-clinic-500 focus:ring-clinic-200'
                  }`}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 select-none p-1"
                  tabIndex={-1}
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
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ROLE_OPTIONS.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setRole(item.role)}
                    disabled={submitting}
                    className={`rounded-xl border p-3.5 text-left transition relative flex flex-col justify-between ${
                      role === item.role
                        ? 'border-clinic-600 bg-clinic-50/50 shadow-sm ring-1 ring-clinic-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                          {item.icon}
                        </div>
                        {role === item.role && (
                          <span className="h-2 w-2 rounded-full bg-clinic-600" />
                        )}
                      </div>
                      <p className="font-semibold text-ink text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/users')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="min-w-[140px] justify-center"
              >
                {submitting ? 'Creating account…' : 'Create User'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
