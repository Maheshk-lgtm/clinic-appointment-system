import type { ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto pb-safe">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <h2 className="font-display text-base sm:text-lg text-ink font-bold truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink text-2xl leading-none px-1.5 py-0.5 rounded-lg hover:bg-slate-100 transition shrink-0"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-4 sm:px-5 py-3.5 sm:py-4">{children}</div>
        {footer && <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-slate-100 flex flex-wrap sm:flex-nowrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-clinic-300 border-t-clinic-600 animate-spin" />
      {label ?? 'Loading…'}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-blue-200/80 bg-blue-50/20 rounded-xl">
      <p className="font-display text-ink font-semibold">{title}</p>
      {body && <p className="text-sm text-slate-500 mt-1">{body}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-blue-100/80 rounded-xl shadow-xs ${className}`}>{children}</div>
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = ''
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-gradient-to-r from-clinic-600 via-sky-600 to-blue-600 hover:from-clinic-700 hover:via-sky-700 hover:to-blue-700 text-white shadow-sm shadow-sky-600/20 active:scale-[0.99]',
    secondary: 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50/70 hover:text-clinic-800 hover:border-blue-300 shadow-2xs',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
    ghost: 'text-clinic-700 hover:bg-blue-50/80 hover:text-clinic-800'
  }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  )
}
