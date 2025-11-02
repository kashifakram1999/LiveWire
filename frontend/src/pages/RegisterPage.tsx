import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { FormEvent } from "react"

import { useAuth } from "../context/AuthContext"

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { registerUser } = useAuth()
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    password_confirm: "",
    display_name: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-semibold text-white">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-slate-300">
              Display name (optional)
            </label>
            <input
              id="display_name"
              type="text"
              value={formState.display_name}
              onChange={(event) => setFormState((prev) => ({ ...prev, display_name: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={formState.password}
              onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-slate-300">
              Confirm password
            </label>
            <input
              id="password_confirm"
              type="password"
              required
              minLength={8}
              value={formState.password_confirm}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, password_confirm: event.target.value }))
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
