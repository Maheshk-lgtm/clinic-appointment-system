import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NotificationBell } from '@/components/NotificationBell'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const ICONS = {
  grid: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  calendar: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  users: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="8" r="2.8" />
      <path d="M21.5 20c0-2.9-1.7-5-4-5.6" />
    </svg>
  ),
  stethoscope: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3v6a4 4 0 0 0 8 0V3" />
      <path d="M17 8v3a6 6 0 0 1-12 0V8" />
      <circle cx="19" cy="6" r="2" />
    </svg>
  ),
  clock: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  list: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  chart: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  ),
  settings: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  )
}

const NAV: Record<'admin' | 'receptionist' | 'doctor', NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: ICONS.grid },
    { to: '/admin/appointments', label: 'Appointments', icon: ICONS.calendar },
    { to: '/admin/doctors', label: 'Doctors', icon: ICONS.stethoscope },
    { to: '/admin/receptionists', label: 'Receptionists', icon: ICONS.users },
    { to: '/admin/users', label: 'All users', icon: ICONS.users },
    { to: '/admin/reports', label: 'Reports', icon: ICONS.chart },
    { to: '/admin/audit-logs', label: 'Audit logs', icon: ICONS.list },
    { to: '/admin/settings', label: 'Settings', icon: ICONS.settings }
  ],
  receptionist: [
    { to: '/receptionist', label: 'Dashboard', icon: ICONS.grid },
    { to: '/receptionist/book', label: 'New booking', icon: ICONS.calendar },
    { to: '/receptionist/reschedules', label: 'Needs rescheduling', icon: ICONS.clock }
  ],
  doctor: [
    { to: '/doctor', label: 'Schedule', icon: ICONS.grid },
    { to: '/doctor/requests', label: 'Requests', icon: ICONS.clock }
  ]
}

export function DashboardLayout() {
  const { profile, logout } = useAuth()
  if (!profile) return null
  const items = NAV[profile.role]

  return (
    <div className="min-h-screen bg-[#f0f6fc] font-body text-ink flex flex-col">
      {/* Top Horizontal Navigation Container (Replacing Vertical Sidebar) */}
      <header className="sticky top-0 z-30 shadow-md bg-gradient-to-r from-[#081b33] via-[#0c284e] to-[#092142] text-white border-b border-sky-900/40">
        {/* Tier 1: Brand Logo, Role Badge, Clinic Network & User Profile */}
        <div className="px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 border-b border-white/10">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-clinic-700 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 ring-2 ring-white/20 select-none shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C7.5 2 4 5 4 10c0 5 2.5 9 4.5 13 1.5-1 2.5-3 3.5-3s2 2 3.5 3c2-4 4.5-8 4.5-13 0-5-3.5-8-8-8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-bold text-base sm:text-xl text-white tracking-tight leading-none">
                  BMD
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  {profile.role}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-sky-300 tracking-wide mt-0.5 leading-none">
                BookMyDentist
              </p>
            </div>
          </div>

          {/* Center Clinic Tagline Badge (desktop only) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-sky-200/90 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Dental Practice & Multi-Doctor Scheduling Platform</span>
          </div>

          {/* Right Action Area: Notifications & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <NotificationBell />

            {/* User Profile Pill & Sign Out */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white/10 border border-white/15 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl backdrop-blur-sm shadow-inner">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-inner select-none shrink-0">
                {profile.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-left min-w-0 max-w-[130px]">
                <p className="text-xs truncate font-semibold text-white leading-tight">
                  {profile.displayName}
                </p>
                <p className="text-[10px] text-sky-300 truncate font-mono">
                  {profile.email}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white border border-red-400/30 transition flex items-center gap-1.5 shrink-0 active:scale-95"
                title="Sign out"
              >
                <span className="hidden xs:inline">Sign out</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Horizontal View for Navigation Options — Responsive Stretched View */}
        <div className="w-full px-1.5 sm:px-4 lg:px-6 bg-[#06162a]/95 backdrop-blur-md border-t border-white/5">
          <nav className="w-full flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-1 sm:py-1.5 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${profile.role}`}
                className={({ isActive }) =>
                  `flex-1 min-w-[88px] sm:min-w-[105px] flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold transition-all select-none text-center ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30 ring-1 ring-sky-300/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <span className="shrink-0 scale-90 sm:scale-100">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area — Full Width Layout with Mobile-Optimized Padding */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
