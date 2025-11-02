import { Link, Outlet } from "react-router-dom"

import { useAuth } from "../context/AuthContext"

export const DashboardLayout = () => {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="px-4 py-6">
          <Link to="/" className="text-xl font-semibold">
            LiveWire
          </Link>
        </div>
        <div className="mt-auto px-4 py-6 text-sm text-slate-400">
          <p>{user?.email}</p>
          <button
            onClick={logout}
            className="mt-3 rounded bg-slate-800 px-3 py-2 text-left font-medium text-slate-100 hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
