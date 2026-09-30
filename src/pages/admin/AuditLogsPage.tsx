import { useEffect, useState } from 'react'
import { listRecentAuditLogs } from '@/services/auditService'
import type { AuditLogEntry } from '@/types'
import { Card, EmptyState, LoadingSpinner } from '@/components/Primitives'

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null)

  useEffect(() => {
    listRecentAuditLogs().then(setLogs)
  }, [])

  if (!logs) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="font-display text-2xl">Audit logs</h1>
      {logs.length === 0 && <EmptyState title="Nothing logged yet" />}
      <Card>
        <div className="divide-y divide-slate-100">
          {logs.map((l) => (
            <div key={l.id} className="p-4 text-sm">
              <p>
                <span className="font-medium">{l.actorName}</span>{' '}
                <span className="text-slate-500 capitalize">({l.actorRole})</span> — {l.action}
              </p>
              {l.previousStatus && l.newStatus && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {l.previousStatus.replaceAll('_', ' ')} → {l.newStatus.replaceAll('_', ' ')}
                </p>
              )}
              {l.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {l.reason}</p>}
              <p className="text-xs text-slate-400 mt-1">
                {l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : ''}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
