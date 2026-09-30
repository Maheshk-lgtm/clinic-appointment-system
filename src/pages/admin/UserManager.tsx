import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  createStaffUser,
  deleteStaffUser,
  generatePasswordResetLink,
  listUsers,
  sendStaffPasswordResetEmail,
  setUserActive,
  updateStaffUser
} from '@/services/userService'
import { createDoctor, getDoctorForUser, linkDoctorToUser } from '@/services/doctorService'
import { auth } from '@/firebase/config'
import type { Role, UserProfile } from '@/types'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@/components/Primitives'

// ── Role badge colours ─────────────────────────────────────────────────────
const ROLE_STYLES: Record<Role, string> = {
  admin:        'bg-blue-50 text-blue-800 border-blue-200',
  receptionist: 'bg-sky-50 text-sky-700 border-sky-200',
  doctor:       'bg-cyan-50 text-cyan-800 border-cyan-200'
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  doctor: 'Doctor'
}

const ROLE_INFO: Record<Role, { desc: string; icon: string }> = {
  doctor: {
    icon: '',
    desc: 'View assigned appointments, accept/decline consultations, manage patient queue.'
  },
  receptionist: {
    icon: '',
    desc: 'Book patients, schedule appointments, handle walk-ins and front-desk reception.'
  },
  admin: {
    icon: '',
    desc: 'Full administrative controls: staff management, doctors, clinic reports & settings.'
  }
}

// ── Avatar initials ────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
  return (
    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold shrink-0 select-none shadow-2xs border border-blue-200/60">
      {initials}
    </div>
  )
}

function generateSecurePassword(): string {
  const words = ['Dental', 'Smile', 'Care', 'Health', 'Clinic', 'Tooth']
  const randomWord = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  const symbols = ['!', '@', '#', '$', '%']
  const sym = symbols[Math.floor(Math.random() * symbols.length)]
  return `${randomWord}@${num}${sym}`
}

// ── Prop types ─────────────────────────────────────────────────────────────
interface UserManagerProps {
  title: string
  allowedRoles: Role[]
  /** If set, the create form skips the role picker and always uses this role. */
  fixedRole?: Role
}

// ══════════════════════════════════════════════════════════════════════════
// UserManager
// ══════════════════════════════════════════════════════════════════════════
export function UserManager({ title, allowedRoles, fixedRole }: UserManagerProps) {
  const { profile } = useAuth()
  const { show } = useToast()

  const [users, setUsers] = useState<UserProfile[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null)
  const [togglingUid, setTogglingUid] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | Role>('all')
  const [recentlyCreatedUid, setRecentlyCreatedUid] = useState<string | null>(null)

  async function load() {
    try {
      const all = await listUsers()
      setUsers(all.filter((u) => allowedRoles.includes(u.role)))
    } catch {
      show('Failed to load users. Check your connection.', 'error')
      setUsers([])
    }
  }

  useEffect(() => { load() }, [])

  if (!users) return <LoadingSpinner label="Loading users…" />

  // Filter by role and search
  const roleFiltered = selectedRole === 'all'
    ? users
    : users.filter((u) => u.role === selectedRole)

  const filtered = search.trim()
    ? roleFiltered.filter((u) =>
        `${u.displayName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      )
    : roleFiltered

  // Counts for tabs
  const doctorCount = users.filter((u) => u.role === 'doctor').length
  const receptionistCount = users.filter((u) => u.role === 'receptionist').length
  const adminCount = users.filter((u) => u.role === 'admin').length

  async function toggleActive(u: UserProfile) {
    if (u.uid === profile?.uid) {
      show("You can't deactivate your own account.", 'error')
      return
    }
    setTogglingUid(u.uid)
    try {
      await setUserActive(u.uid, !u.active)
      show(u.active ? `${u.displayName} deactivated.` : `${u.displayName} activated.`, 'success')
      load()
    } catch {
      show('Could not update account status.', 'error')
    } finally {
      setTogglingUid(null)
    }
  }

  const creatorUid = profile?.uid || auth.currentUser?.uid || 'admin'

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-ink">{title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} {users.length === 1 ? 'account' : 'accounts'} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!fixedRole && (
            <Link
              to="/admin/users/new"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-ink font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Dedicated Add Page
            </Link>
          )}
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Add {fixedRole ? ROLE_LABELS[fixedRole] : 'user'}
          </Button>
        </div>
      </div>

      {/* Role filter tabs (only when multiple roles allowed) */}
      {allowedRoles.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-sm">
          <button
            type="button"
            onClick={() => setSelectedRole('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 ${
              selectedRole === 'all'
                ? 'bg-clinic-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Accounts
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRole === 'all' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
              {users.length}
            </span>
          </button>

          {allowedRoles.includes('doctor') && (
            <button
              type="button"
              onClick={() => setSelectedRole('doctor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 ${
                selectedRole === 'doctor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Doctors
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRole === 'doctor' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                {doctorCount}
              </span>
            </button>
          )}

          {allowedRoles.includes('receptionist') && (
            <button
              type="button"
              onClick={() => setSelectedRole('receptionist')}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 ${
                selectedRole === 'receptionist'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Receptionists
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRole === 'receptionist' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                {receptionistCount}
              </span>
            </button>
          )}

          {allowedRoles.includes('admin') && (
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 ${
                selectedRole === 'admin'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Admins
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRole === 'admin' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                {adminCount}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Search */}
      {users.length > 2 && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            placeholder="Search accounts by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-300 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Empty states */}
      {users.length === 0 && (
        <EmptyState
          title="No accounts yet"
          body={`Create the first ${fixedRole ? ROLE_LABELS[fixedRole].toLowerCase() : 'account'} to get started.`}
        />
      )}
      {users.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No results found"
          body={`No accounts match your current filter or search "${search}".`}
        />
      )}

      {/* User list */}
      {filtered.length > 0 && (
        <Card>
          <div className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const isNewlyCreated = u.uid === recentlyCreatedUid
              return (
                <div
                  key={u.uid}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isNewlyCreated ? 'bg-emerald-50/60 ring-1 ring-emerald-300' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <Avatar name={u.displayName} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="font-semibold text-ink text-xs sm:text-sm">{u.displayName}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_STYLES[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                        {isNewlyCreated && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white animate-pulse">
                            NEW
                          </span>
                        )}
                        {!u.active && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5 font-mono">{u.email}</p>
                    </div>
                  </div>

                  {/* Right: action buttons (Edit + Deactivate/Activate + Delete) */}
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-1.5 sm:pt-0 border-t border-slate-100 sm:border-0">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingUser(u)}
                      className="text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1 hover:border-clinic-400 hover:text-clinic-800"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      variant={u.active ? 'danger' : 'secondary'}
                      disabled={togglingUid === u.uid}
                      onClick={() => toggleActive(u)}
                      className="text-xs py-1.5 px-2.5 sm:px-3"
                    >
                      {togglingUid === u.uid
                        ? 'Updating…'
                        : u.active
                        ? 'Deactivate'
                        : 'Activate'}
                    </Button>
                    {u.uid !== profile?.uid && (
                      <button
                        type="button"
                        onClick={() => setDeletingUser(u)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 text-xs transition shadow-2xs"
                        title={`Delete ${u.displayName}`}
                        aria-label={`Delete ${u.displayName}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          fixedRole={fixedRole}
          allowedRoles={allowedRoles}
          onClose={() => setEditingUser(null)}
          onRequestDelete={(u) => {
            setEditingUser(null)
            setDeletingUser(u)
          }}
          onUpdated={() => {
            setEditingUser(null)
            load()
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => {
            setDeletingUser(null)
            load()
          }}
        />
      )}

      {/* Create modal */}
      {creating && (
        <CreateUserModal
          fixedRole={fixedRole}
          allowedRoles={allowedRoles}
          createdBy={creatorUid}
          onClose={() => setCreating(false)}
          onCreated={(newUid) => {
            if (newUid) setRecentlyCreatedUid(newUid)
            load()
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// DeleteConfirmModal — confirmation dialog before permanently deleting user
// ══════════════════════════════════════════════════════════════════════════
interface DeleteConfirmModalProps {
  user: UserProfile
  onClose: () => void
  onDeleted: () => void
}

function DeleteConfirmModal({ user, onClose, onDeleted }: DeleteConfirmModalProps) {
  const { show } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteStaffUser(user.uid)
      show(`User "${user.displayName}" has been permanently deleted.`, 'success')
      onDeleted()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete user account.'
      show(msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete User Account"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting account…' : 'Permanently Delete'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning banner */}
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 flex items-start gap-3 text-xs text-red-900">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-bold text-red-800">Permanent Action Warning</p>
            <p className="mt-1 text-red-700 leading-relaxed">
              Are you sure you want to permanently delete this user? Their login credentials will be removed from Firebase Authentication and their account profile will be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user.displayName} />
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate text-sm">{user.displayName}</p>
              <p className="text-slate-500 font-mono text-xs truncate">{user.email}</p>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${ROLE_STYLES[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          This user will immediately lose all access to BMD (BookMyDentist).
        </p>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// EditUserModal — allows admin to modify name, email, role, status & view/reset password
// ══════════════════════════════════════════════════════════════════════════
interface EditUserModalProps {
  user: UserProfile
  fixedRole?: Role
  allowedRoles: Role[]
  onClose: () => void
  onUpdated: () => void
  onRequestDelete?: (user: UserProfile) => void
}

function EditUserModal({ user, fixedRole, allowedRoles, onClose, onUpdated, onRequestDelete }: EditUserModalProps) {
  const { profile } = useAuth()
  const { show } = useToast()

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details')
  const [displayName, setDisplayName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<Role>(user.role)
  const [active, setActive] = useState(user.active)

  // Current password state
  const currentPassword = user.tempPassword || 'Passw0rd!'
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [copiedCurrent, setCopiedCurrent] = useState(false)

  // New password state (for admin reset)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({})
  const [passwordChangedCredentials, setPasswordChangedCredentials] = useState<{
    displayName: string
    email: string
    password: string
    role: Role
  } | null>(null)

  // Password reset link & email states
  const [resetMethod, setResetMethod] = useState<'direct' | 'link' | 'email'>('direct')
  const [generatedResetLink, setGeneratedResetLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null)

  function copyCurrentPassword() {
    navigator.clipboard.writeText(currentPassword).then(() => {
      setCopiedCurrent(true)
      show('Current password copied to clipboard!', 'success')
      setTimeout(() => setCopiedCurrent(false), 2500)
    })
  }

  function handleGeneratePassword() {
    const pw = generateSecurePassword()
    setNewPassword(pw)
    setShowNewPassword(true)
    if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
    show('Generated strong password.', 'info')
  }

  async function handleGenerateResetLink() {
    setGeneratingLink(true)
    try {
      const link = await generatePasswordResetLink(email.trim().toLowerCase() || user.email)
      setGeneratedResetLink(link)
      show('Password reset link generated successfully!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not generate reset link.'
      show(msg, 'error')
    } finally {
      setGeneratingLink(false)
    }
  }

  function copyResetLink() {
    if (!generatedResetLink) return
    navigator.clipboard.writeText(generatedResetLink).then(() => {
      setCopiedLink(true)
      show('Reset link copied to clipboard!', 'success')
      setTimeout(() => setCopiedLink(false), 2500)
    })
  }

  async function handleSendResetEmail() {
    setSendingEmail(true)
    setEmailSentNotice(null)
    const targetEmail = email.trim().toLowerCase() || user.email
    try {
      await sendStaffPasswordResetEmail(targetEmail)
      setEmailSentNotice(`Reset email sent to ${targetEmail}`)
      show(`Password reset email sent to ${targetEmail}!`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send reset email.'
      show(msg, 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  function validate() {
    const next: typeof errors = {}
    if (!displayName.trim()) next.displayName = 'Full name is required.'
    if (!email.trim()) {
      next.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (newPassword && newPassword.length < 8) {
      next.password = 'Password must be at least 8 characters long.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (!validate()) {
      if (errors.displayName || errors.email) {
        setActiveTab('details')
      }
      return
    }

    setSubmitting(true)
    setErrors({})

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = displayName.trim()

    try {
      await updateStaffUser({
        uid: user.uid,
        displayName: cleanName,
        email: cleanEmail,
        password: newPassword.trim() || undefined,
        role,
        active
      })

      if (newPassword.trim()) {
        setPasswordChangedCredentials({
          displayName: cleanName,
          email: cleanEmail,
          password: newPassword.trim(),
          role
        })
        show(`User details and password updated for ${cleanName}!`, 'success')
      } else {
        show(`Updated account details for ${cleanName}!`, 'success')
        onUpdated()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update account.'
      if (message.toLowerCase().includes('already registered') || (message.toLowerCase().includes('email') && message.toLowerCase().includes('exist'))) {
        setActiveTab('details')
        setErrors({ email: message })
      } else {
        show(message, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function copyUpdatedCredentials() {
    if (!passwordChangedCredentials) return
    const text = [
      `BMD (BookMyDentist) - Updated Credentials`,
      `Name: ${passwordChangedCredentials.displayName}`,
      `Email: ${passwordChangedCredentials.email}`,
      `Role: ${passwordChangedCredentials.role.toUpperCase()}`,
      `New Password: ${passwordChangedCredentials.password}`,
      `Sign In URL: ${window.location.origin}/login`
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      show('Updated credentials copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const passwordStrength = getPasswordStrength(newPassword)

  if (passwordChangedCredentials) {
    return (
      <Modal
        open
        onClose={onUpdated}
        title="Password & Details Updated"
        footer={
          <Button onClick={onUpdated} className="w-full justify-center">
            Done (Return to User List)
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-ink">Account & Password Updated</p>
            <p className="text-xs text-slate-500">
              Share the updated login credentials below with the staff member.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-ink">{passwordChangedCredentials.displayName}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Email</span>
              <span className="font-mono text-ink font-medium">{passwordChangedCredentials.email}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Role</span>
              <span className={`capitalize font-semibold px-1.5 py-0.5 rounded border ${ROLE_STYLES[passwordChangedCredentials.role]}`}>
                {ROLE_LABELS[passwordChangedCredentials.role]}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">New Password</span>
              <span className="font-mono font-bold text-clinic-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {passwordChangedCredentials.password}
              </span>
            </div>
          </div>

          <Button
            className="w-full justify-center text-xs py-2 shadow-sm flex items-center gap-1.5"
            onClick={copyUpdatedCredentials}
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
                Copy Updated Credentials
              </>
            )}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit User: ${user.displayName}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div>
            {user.uid !== profile?.uid && onRequestDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onRequestDelete(user)
                }}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete User
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Saving changes…' : newPassword.trim() ? 'Save Changes & Reset Password' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 -mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'details'
                ? 'border-clinic-600 text-clinic-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-clinic-600 text-clinic-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Password & Reset
            {newPassword && (
              <span className="h-1.5 w-1.5 rounded-full bg-clinic-600" />
            )}
          </button>
        </div>

        {/* TAB 1: User Details */}
        {activeTab === 'details' && (
          <div className="space-y-4 pt-1">
            {/* Full name */}
            <Field label="Full name" required error={errors.displayName}>
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }))
                }}
                placeholder="Dr. Jane Smith"
                className={inputCls(!!errors.displayName)}
                disabled={submitting}
              />
            </Field>

            {/* Email */}
            <Field label="Email address" required error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                placeholder="jane@clinic.com"
                className={inputCls(!!errors.email)}
                disabled={submitting}
              />
            </Field>

            {/* Role picker (if not fixed) */}
            {!fixedRole && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {allowedRoles.map((r) => {
                    const info = ROLE_INFO[r]
                    const isSelected = role === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        disabled={submitting}
                        className={`rounded-lg border p-2.5 text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-clinic-500 bg-clinic-50 text-clinic-900 ring-1 ring-clinic-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{info.icon}</span>
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-clinic-600" />}
                          </div>
                          <p className="font-semibold text-xs text-ink">{ROLE_LABELS[r]}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Account status */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActive(true)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setActive(false)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    !active
                      ? 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Inactive (Deactivated)
                </button>
              </div>
            </div>

            {/* Password banner shortcut */}
            <div className="rounded-xl border border-clinic-200 bg-clinic-50/50 p-3 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-clinic-900 block">Password & Security</span>
                <span className="text-slate-500 text-[11px]">
                  Current: <span className="font-mono text-ink font-medium">{showCurrentPassword ? currentPassword : '••••••••••••'}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className="px-2.5 py-1.5 rounded-lg bg-clinic-600 hover:bg-clinic-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                View & Reset →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Password & Reset */}
        {activeTab === 'security' && (
          <div className="space-y-4 pt-1">
            {/* 1. CURRENT ASSIGNED PASSWORD CARD */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <label className="text-xs font-bold text-ink uppercase tracking-wide">
                    Current Assigned Password
                  </label>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clinic-100 text-clinic-800 border border-clinic-200">
                  Active Login
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                This is the password currently stored for this staff member to sign in.
              </p>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-ink select-all focus:outline-none focus:border-clinic-500 shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition shrink-0 shadow-sm"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                  <span>{showCurrentPassword ? 'Hide' : 'Show password'}</span>
                </button>
                <button
                  type="button"
                  onClick={copyCurrentPassword}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition shrink-0 shadow-sm"
                  title="Copy password to clipboard"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{copiedCurrent ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 2. ASK FOR RESET PASSWORD SECTION */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-3 bg-white">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-xs font-bold text-ink uppercase tracking-wide">
                  Reset Password Options
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Select an option to reset this user's password or provide them access:
              </p>

              {/* Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setResetMethod('direct')}
                  className={`py-1.5 px-2 rounded-md font-medium transition text-center flex items-center justify-center gap-1 ${
                    resetMethod === 'direct'
                      ? 'bg-white text-clinic-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Set Password
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('link')}
                  className={`py-1.5 px-2 rounded-md font-medium transition text-center flex items-center justify-center gap-1 ${
                    resetMethod === 'link'
                      ? 'bg-white text-clinic-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('email')}
                  className={`py-1.5 px-2 rounded-md font-medium transition text-center flex items-center justify-center gap-1 ${
                    resetMethod === 'email'
                      ? 'bg-white text-clinic-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email User
                </button>
              </div>

              {/* Method 1: Set New Password Directly */}
              {resetMethod === 'direct' && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      New Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs text-clinic-700 hover:text-clinic-900 font-semibold flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generate Secure
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                      }}
                      placeholder="Type a new password or click Generate Secure"
                      className={`${inputCls(!!errors.password)} pr-10 font-mono text-xs`}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 select-none p-1"
                      tabIndex={-1}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
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

                  {newPassword.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < passwordStrength.score
                                ? passwordStrength.color
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">{passwordStrength.label}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Click <strong>Save Changes</strong> below to apply this new password to the user's account.
                  </p>
                </div>
              )}

              {/* Method 2: Generate Password Reset Link */}
              {resetMethod === 'link' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs text-slate-600">
                    Generate an official Firebase password reset URL to send to the staff member via WhatsApp, SMS, or internal messaging.
                  </p>

                  {!generatedResetLink ? (
                    <Button
                      variant="secondary"
                      onClick={handleGenerateResetLink}
                      disabled={generatingLink}
                      className="w-full justify-center text-xs py-2 border-clinic-300 text-clinic-800 hover:bg-clinic-50"
                    >
                      {generatingLink ? 'Generating reset link…' : 'Generate Password Reset Link'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-semibold">Reset link generated successfully!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedResetLink}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-mono select-all text-slate-700"
                        />
                        <Button
                          onClick={copyResetLink}
                          className="text-xs py-1.5 px-3 shrink-0"
                        >
                          {copiedLink ? 'Copied' : 'Copy Link'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        The user can open this link to choose their own new password.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Method 3: Send Password Reset Email */}
              {resetMethod === 'email' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs text-slate-600">
                    Send an official password reset email to: <span className="font-mono font-semibold text-ink">{email || user.email}</span>
                  </p>

                  {emailSentNotice ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Reset email sent!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Instructions to reset password have been sent to {email || user.email}.
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={handleSendResetEmail}
                      disabled={sendingEmail}
                      className="w-full justify-center text-xs py-2 border-clinic-300 text-clinic-800 hover:bg-clinic-50"
                    >
                      {sendingEmail ? 'Sending reset email…' : 'Send Password Reset Email'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// CreateUserModal — intuitive form with strong UX, generator & credentials
// ══════════════════════════════════════════════════════════════════════════
interface CreateUserModalProps {
  fixedRole?: Role
  allowedRoles: Role[]
  createdBy: string
  onClose: () => void
  onCreated: (newUid?: string) => void
}

function CreateUserModal({ fixedRole, allowedRoles, createdBy, onClose, onCreated }: CreateUserModalProps) {
  const { show } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>(fixedRole ?? allowedRoles[0])
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Newly created credentials state
  const [createdUser, setCreatedUser] = useState<{
    uid: string
    displayName: string
    email: string
    password: string
    role: Role
  } | null>(null)

  // Per-field error messages
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({})

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

  async function submit() {
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = displayName.trim()

    try {
      const res = await createStaffUser({
        email: cleanEmail,
        password,
        displayName: cleanName,
        role,
        createdBy
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
          console.warn('[UserManager] Could not auto-link doctor profile:', docErr)
        }
      }

      show(`Account created for ${cleanName}!`, 'success')
      setCreatedUser({
        uid: res.uid,
        displayName: cleanName,
        email: cleanEmail,
        password,
        role
      })
      onCreated(res.uid)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create the account.'

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
      `Login URL: ${window.location.origin}/login`
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      show('Credentials copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function resetToAnother() {
    setDisplayName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setRole(fixedRole ?? allowedRoles[0])
    setErrors({})
    setCreatedUser(null)
  }

  const passwordStrength = getPasswordStrength(password)

  // If user was created, show Credentials screen in modal
  if (createdUser) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Account Created Successfully"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={resetToAnother}>
              + Add Another User
            </Button>
            <Button onClick={onClose}>
              Done (View in List)
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-ink">User is ready to sign in</p>
            <p className="text-xs text-slate-500">
              Share the temporary credentials below with the staff member.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-ink">{createdUser.displayName}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Email</span>
              <span className="font-mono text-ink font-medium">{createdUser.email}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500">Role</span>
              <span className={`capitalize font-semibold px-1.5 py-0.5 rounded border ${ROLE_STYLES[createdUser.role]}`}>
                {ROLE_LABELS[createdUser.role]}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Password</span>
              <span className="font-mono font-bold text-clinic-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {createdUser.password}
              </span>
            </div>
          </div>

          <Button
            className="w-full justify-center text-xs py-2 flex items-center gap-1.5"
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
            <div className="bg-clinic-50 border border-clinic-200 rounded-lg p-2.5 text-xs text-clinic-800 flex items-center justify-between">
              <span>Next step: set up doctor schedule?</span>
              <Link
                to="/admin/doctors"
                onClick={onClose}
                className="font-semibold underline ml-1 hover:text-clinic-900"
              >
                Go to Doctors →
              </Link>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add ${fixedRole ? ROLE_LABELS[fixedRole] : 'User Account'}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Full name */}
        <Field
          label="Full name"
          required
          error={errors.displayName}
        >
          <input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }))
            }}
            placeholder="e.g. Dr. Jane Smith or Rahul Sharma"
            className={inputCls(!!errors.displayName)}
            disabled={submitting}
            autoFocus
          />
        </Field>

        {/* Email */}
        <Field label="Email address" required error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
            }}
            placeholder="e.g. jane@clinic.test"
            className={inputCls(!!errors.email)}
            disabled={submitting}
          />
        </Field>

        {/* Password */}
        <Field
          label="Temporary password"
          required
          error={errors.password}
          rightAction={
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-xs text-clinic-700 hover:text-clinic-900 font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generate
            </button>
          }
        >
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
              }}
              placeholder="Min. 8 characters (or click Generate)"
              className={`${inputCls(!!errors.password)} pr-10 font-mono`}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 select-none p-1"
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
          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength.score
                        ? passwordStrength.color
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-slate-500 shrink-0">{passwordStrength.label}</span>
            </div>
          )}
        </Field>

        {/* Role picker — only shown when not fixed */}
        {!fixedRole && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {allowedRoles.map((r) => {
                const info = ROLE_INFO[r]
                const isSelected = role === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    disabled={submitting}
                    className={`rounded-lg border p-2.5 text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-clinic-500 bg-clinic-50 text-clinic-900 ring-1 ring-clinic-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{info.icon}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-clinic-600" />}
                      </div>
                      <p className="font-semibold text-xs text-ink">{ROLE_LABELS[r]}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {ROLE_INFO[role]?.desc}
            </p>
          </div>
        )}

        {/* Info note */}
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          The user will sign in with these credentials at <span className="font-mono text-ink font-medium">/login</span>.
        </p>
      </div>
    </Modal>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-300'
      : 'border-slate-300 focus:border-clinic-500 focus:ring-clinic-300'
  } disabled:opacity-50`
}

function Field({
  label,
  required,
  error,
  rightAction,
  children
}: {
  label: string
  required?: boolean
  error?: string
  rightAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-slate-600">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {rightAction}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500']
  return { score, label: labels[score - 1] ?? 'Weak', color: colors[score - 1] ?? 'bg-red-400' }
}

// ── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="mr-1.5 -ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
