import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { FormEvent } from "react"
import { FiEye, FiEyeOff, FiMoon, FiSun } from "react-icons/fi"

import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { registerUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    password_confirm: "",
    display_name: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const isDark = theme === "dark"
  const ThemeIcon = isDark ? FiSun : FiMoon

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (formState.password !== formState.password_confirm) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await registerUser(formState)
      navigate("/")
    } catch (err) {
      setError("Unable to register. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={`min-h-screen px-4 py-10 transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10"
      }`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/95 shadow-[0_20px_80px_rgba(15,23,42,0.3)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95 lg:flex-row">
        <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-500 to-cyan-400 p-10 text-white lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/80">Create</p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Join LiveWire and keep every conversation electric.
            </h1>
            <p className="mt-4 text-base text-white/90">
              Build group chats, collaborate instantly, and watch updates arrive in real time.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm text-white/90">
            <div className="rounded-3xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Realtime</p>
              <p className="mt-2 text-lg font-bold">Instant messaging</p>
            </div>
            <div className="rounded-3xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Control</p>
              <p className="mt-2 text-lg font-bold">Team spaces</p>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-1 flex-col justify-center p-10">
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                LiveWire{" "}
                <span className="ml-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                  chat
                </span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-white dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                aria-label="Toggle color theme"
              >
                <ThemeIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                get started
              </p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create your LiveWire account</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Set up your profile and invite teammates.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-600 dark:text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>
            <div>
              <label htmlFor="display_name" className="block text-sm font-semibold text-slate-600 dark:text-slate-200">
                Display name (optional)
              </label>
              <input
                id="display_name"
                type="text"
                value={formState.display_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, display_name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-600 dark:text-slate-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formState.password}
                  onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 mt-2 flex items-center text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password_confirm" className="block text-sm font-semibold text-slate-600 dark:text-slate-200">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="password_confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formState.password_confirm}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, password_confirm: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 mt-2 flex items-center text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                  aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                >
                  {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:shadow-xl disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-300 lg:text-left">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-indigo-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
