import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useToast } from '@/context/ToastContext'
import { createDoctor, listDoctors, setDoctorActive, updateDoctor } from '@/services/doctorService'
import { createSpecialization, listSpecializations, listUsers, linkDoctorAccount } from '@/services/userService'
import type { Doctor, Specialization, UserProfile, Weekday, WorkingHours } from '@/types'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@/components/Primitives'

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' }
]

function defaultHours(): WorkingHours[] {
  return DAYS.map((d) => ({ day: d.key, enabled: !['sat', 'sun'].includes(d.key), start: '09:00', end: '17:00' }))
}

export function DoctorsPage() {
  const { show } = useToast()
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [doctorUsers, setDoctorUsers] = useState<UserProfile[]>([])
  const [editing, setEditing] = useState<Doctor | 'new' | null>(null)

  async function load() {
    const [d, s, u] = await Promise.all([listDoctors(false), listSpecializations(false), listUsers()])
    const docUsers = u.filter((x) => x.role === 'doctor')
    setDoctors(d)
    setSpecializations(s)
    setDoctorUsers(docUsers)

    // Proactively heal any missing two-way links for existing doctors and doctor users
    for (const docItem of d) {
      if (docItem.userId) {
        const matchingUser = docUsers.find((user) => user.uid === docItem.userId)
        if (matchingUser && matchingUser.doctorId !== docItem.id) {
          linkDoctorAccount(docItem.userId, docItem.id).catch(console.warn)
          matchingUser.doctorId = docItem.id
        }
      } else if (docItem.email) {
        // If doctor doc has no userId, try finding user with matching email
        const matchingUser = docUsers.find(
          (user) => user.email.trim().toLowerCase() === docItem.email.trim().toLowerCase()
        )
        if (matchingUser) {
          updateDoctor(docItem.id, { userId: matchingUser.uid }).catch(console.warn)
          linkDoctorAccount(matchingUser.uid, docItem.id).catch(console.warn)
          docItem.userId = matchingUser.uid
          matchingUser.doctorId = docItem.id
        }
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (!doctors) return <LoadingSpinner />

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Doctors</h1>
        <Button onClick={() => setEditing('new')}>Add doctor</Button>
      </div>

      {doctors.length === 0 && <EmptyState title="No doctors yet" body="Add your first doctor to start scheduling." />}

      <div className="grid sm:grid-cols-2 gap-3">
        {doctors.map((d) => {
          const linkedUser = doctorUsers.find((u) => u.uid === d.userId)
          return (
            <Card key={d.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">{d.name}</p>
                    <p className="text-sm text-slate-500">{d.specializationName || 'General Dentist'}</p>
                    <p className="text-xs text-slate-400 mt-1">{d.consultationMinutes} min slots</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${d.active ? 'bg-clinic-50 text-clinic-700 border-clinic-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  {linkedUser ? (
                    <div className="flex items-center gap-1.5 text-xs text-clinic-700 bg-clinic-50/70 border border-clinic-200/60 rounded px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-clinic-500 shrink-0"></span>
                      <span className="truncate">Login account: <strong className="font-semibold">{linkedUser.displayName}</strong> ({linkedUser.email})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        No login account linked — doctor cannot view Today tab
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => setEditing(d)}>
                  Edit
                </Button>
                <Button
                  variant={d.active ? 'danger' : 'secondary'}
                  onClick={async () => {
                    await setDoctorActive(d.id, !d.active)
                    show(d.active ? 'Doctor deactivated.' : 'Doctor activated.', 'success')
                    load()
                  }}
                >
                  {d.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {editing && (
        <DoctorEditor
          doctor={editing === 'new' ? null : editing}
          specializations={specializations}
          doctorUsers={doctorUsers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function DoctorEditor({
  doctor,
  specializations,
  doctorUsers,
  onClose,
  onSaved
}: {
  doctor: Doctor | null
  specializations: Specialization[]
  doctorUsers: UserProfile[]
  onClose: () => void
  onSaved: () => void
}) {
  const { show } = useToast()
  const [name, setName] = useState(doctor?.name ?? '')
  const [userId, setUserId] = useState(doctor?.userId ?? '')
  const [specializationId, setSpecializationId] = useState(doctor?.specializationId ?? '')
  const [newSpecialization, setNewSpecialization] = useState('')
  const [qualification, setQualification] = useState(doctor?.qualification ?? '')
  const [phone, setPhone] = useState(doctor?.phone ?? '')
  const [email, setEmail] = useState(doctor?.email ?? '')
  const [duration, setDuration] = useState(doctor?.consultationMinutes ?? 30)
  const [hours, setHours] = useState<WorkingHours[]>(doctor?.workingHours ?? defaultHours())
  const [saving, setSaving] = useState(false)

  function updateDay(day: Weekday, patch: Partial<WorkingHours>) {
    setHours((h) => h.map((w) => (w.day === day ? { ...w, ...patch } : w)))
  }

  function handleUserChange(selectedUid: string) {
    setUserId(selectedUid)
    const user = doctorUsers.find((u) => u.uid === selectedUid)
    if (user) {
      if (!name.trim()) setName(user.displayName)
      if (!email.trim()) setEmail(user.email)
    }
  }

  async function save() {
    if (!name.trim() || !userId) {
      show('Name and linked user account are required.', 'error')
      return
    }
    setSaving(true)
    try {
      let specId = specializationId
      let specName = specializations.find((s) => s.id === specId)?.name ?? ''
      if (!specId && newSpecialization.trim()) {
        specId = await createSpecialization(newSpecialization.trim())
        specName = newSpecialization.trim()
      }
      const linkedUser = doctorUsers.find((u) => u.uid === userId)

      let savedDoctorId = doctor?.id
      if (doctor) {
        await updateDoctor(doctor.id, {
          name: name.trim(),
          userId,
          specializationId: specId,
          specializationName: specName,
          qualification,
          phone,
          email: email.trim() || linkedUser?.email || '',
          consultationMinutes: duration,
          workingHours: hours
        })
        if (doctor.userId && doctor.userId !== userId) {
          try {
            await updateDoc(doc(db, 'users', doctor.userId), { doctorId: null })
          } catch (e) {
            console.warn('Failed unlinking old doctor user:', e)
          }
        }
      } else {
        const docRef = await createDoctor({
          name: name.trim(),
          userId,
          specializationId: specId,
          specializationName: specName,
          qualification,
          phone,
          email: email.trim() || linkedUser?.email || '',
          consultationMinutes: duration,
          workingHours: hours,
          exceptions: [],
          active: true
        })
        savedDoctorId = docRef.id
      }

      // Guarantee the user document is linked with doctorId
      if (userId && savedDoctorId) {
        await linkDoctorAccount(userId, savedDoctorId)
      }

      show('Doctor profile saved and linked successfully.', 'success')
      onSaved()
    } catch {
      show('Could not save doctor.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={doctor ? 'Edit doctor' : 'Add doctor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save doctor'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Full name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Linked login (doctor account) *</label>
          <select value={userId} onChange={(e) => handleUserChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select account…</option>
            {doctorUsers.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.displayName} ({u.email})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Need an account?{' '}
            <Link to="/admin/users/new" className="text-clinic-700 underline font-medium hover:text-clinic-900">
              + Create a new doctor user account here
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Specialization</label>
            <select value={specializationId} onChange={(e) => setSpecializationId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select or add new…</option>
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!specializationId && (
              <input
                placeholder="New specialization name"
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mt-1.5"
              />
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Consultation duration (min)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Qualification</label>
            <input value={qualification} onChange={(e) => setQualification(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@clinic.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-2">Working hours</label>
          <div className="space-y-1.5">
            {hours.map((w) => (
              <div key={w.day} className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5 w-16">
                  <input type="checkbox" checked={w.enabled} onChange={(e) => updateDay(w.day, { enabled: e.target.checked })} />
                  {DAYS.find((d) => d.key === w.day)?.label}
                </label>
                <input
                  type="time"
                  disabled={!w.enabled}
                  value={w.start}
                  onChange={(e) => updateDay(w.day, { start: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  disabled={!w.enabled}
                  value={w.end}
                  onChange={(e) => updateDay(w.day, { end: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
