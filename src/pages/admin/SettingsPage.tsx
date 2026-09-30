import { useEffect, useState } from 'react'
import { useToast } from '@/context/ToastContext'
import { getSystemSettings, updateSystemSettings } from '@/services/settingsService'
import type { SystemSettings } from '@/types'
import { Button, Card, LoadingSpinner } from '@/components/Primitives'

export function SettingsPage() {
  const { show } = useToast()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSystemSettings(true).then(setSettings)
  }, [])

  if (!settings) return <LoadingSpinner />

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      await updateSystemSettings(settings)
      show('Settings saved.', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="font-display text-2xl">Settings</h1>
      <Card className="p-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Clinic name</label>
          <input
            value={settings.clinicName}
            onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Temporary booking expiry (minutes)</label>
          <input
            type="number"
            min={1}
            value={settings.temporaryBookingMinutes}
            onChange={(e) => setSettings({ ...settings, temporaryBookingMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">
            If a doctor doesn't respond within this window, the booking expires and the slot reopens automatically.
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Default consultation length (minutes)</label>
          <input
            type="number"
            min={5}
            value={settings.defaultConsultationMinutes}
            onChange={(e) => setSettings({ ...settings, defaultConsultationMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </Card>
    </div>
  )
}
