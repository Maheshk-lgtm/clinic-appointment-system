import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { SystemSettings } from '@/types'

const SETTINGS_REF = () => doc(db, 'settings', 'global')

const defaultTempMinutes = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_TEMP_BOOKING_MINUTES)
  ? Number(import.meta.env.VITE_DEFAULT_TEMP_BOOKING_MINUTES)
  : 15

const DEFAULTS: SystemSettings = {
  temporaryBookingMinutes: defaultTempMinutes,
  defaultConsultationMinutes: 30,
  clinicName: 'BMD (BookMyDentist)'
}

let cache: SystemSettings | null = null

export async function getSystemSettings(forceRefresh = false): Promise<SystemSettings> {
  if (cache && !forceRefresh) return cache
  const snap = await getDoc(SETTINGS_REF())
  cache = snap.exists() ? ({ ...DEFAULTS, ...snap.data() } as SystemSettings) : DEFAULTS
  return cache
}

export async function updateSystemSettings(patch: Partial<SystemSettings>) {
  const current = await getSystemSettings()
  const next = { ...current, ...patch }
  await setDoc(SETTINGS_REF(), next, { merge: true })
  cache = next
}

export function invalidateSettingsCache() {
  cache = null
}
