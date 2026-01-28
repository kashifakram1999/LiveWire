import { useCallback, useMemo, useState, type ReactNode } from "react"
import { FiMoon, FiSun } from "react-icons/fi"
import { Link, Outlet } from "react-router-dom"

import { useAuth } from "../context/AuthContext"
import { SidebarProvider } from "../context/SidebarContext"
import { useTheme } from "../context/ThemeContext"

export const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  const sidebarValue = useMemo(
    () => ({
      setSidebarContent,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [setSidebarContent, isSidebarOpen, openSidebar, closeSidebar, toggleSidebar],
  )

  const isDark = theme === "dark"
  const glassCard =
    "mx-auto flex w-full min-h-[90vh] max-w-7xl flex-col overflow-hidden rounded-[24px] border border-white/30 bg-white/90 shadow-[0_25px_90px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90"
  const overlayColor = isDark ? "bg-slate-900/80" : "bg-slate-900/60"
  const sidebarBase =
    "flex h-full w-full max-w-sm flex-col rounded-[28px] border border-white/30 bg-white/95 p-5 text-slate-900 shadow-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-900/95 dark:text-white md:rounded-none md:border-y-0 md:border-l-0 md:border-r md:border-white/30 md:bg-transparent md:shadow-none"
  const buttonBase =
    "rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-white"
  const signOutButtonClasses =
    "mt-4 w-full rounded-2xl bg-slate-900/90 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-slate-900 dark:bg-white/90 dark:text-slate-900"
  const themeToggleClasses =
    "hidden items-center gap-2 rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-white dark:border-white/30 dark:text-white dark:hover:bg-white/10 md:inline-flex"
  const themeToggleMobileClasses =
    "inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-white dark:border-white/30 dark:text-white dark:hover:bg-white/10 md:hidden"

  const themeToggleLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  const ThemeIcon = theme === "dark" ? FiSun : FiMoon

  return (
    <SidebarProvider value={sidebarValue}>
      <div className="flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-10">
        <div className={glassCard}>
          <div
            className={`fixed inset-0 z-40 ${overlayColor} transition-opacity duration-200 md:hidden ${
              isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={closeSidebar}
          />
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            <aside
              className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] transform flex-col md:static md:z-auto md:w-80 md:max-w-none md:translate-x-0 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              }`}
            >
              <div className={sidebarBase}>
                <div className="flex items-center justify-between gap-3">
                  <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    LiveWire
                    <span className="ml-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      chat
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className={themeToggleClasses}
                      aria-label="Toggle color mode"
                    >
                      <ThemeIcon className="h-4 w-4" />
                      <span className="sr-only">{themeToggleLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={closeSidebar}
                      className={`md:hidden ${buttonBase}`}
                      aria-label="Close conversations panel"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={themeToggleMobileClasses}
                  aria-label="Toggle color mode"
                >
                  <ThemeIcon className="h-4 w-4" />
                  <span className="sr-only">{themeToggleLabel}</span>
                </button>
                <div className="mt-5 flex-1 overflow-hidden rounded-2xl border border-white/30 bg-white/70 text-slate-900 shadow-inner dark:border-white/10 dark:bg-slate-900/70 dark:text-white">
                  <div className="h-full overflow-y-auto">
                    {sidebarContent ?? (
                      <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">Nothing to show yet.</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-white/30 bg-white/80 p-4 text-sm shadow-inner dark:border-white/10 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    signed in
                  </p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{user?.email}</p>
                  <button onClick={logout} className={signOutButtonClasses}>
                    Sign out
                  </button>
                </div>
              </div>
            </aside>
            <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
              <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-900/90">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
