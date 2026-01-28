import { Fragment, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { listUsers } from "../api/users"
import type { User } from "../types"

type ConversationModalProps = {
  mode: "create" | "edit"
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: { title: string; participantIds: number[] }) => Promise<void>
  initialTitle?: string
  initialParticipantIds?: number[]
}

export const ConversationModal = ({
  mode,
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  initialParticipantIds = [],
}: ConversationModalProps) => {
  const [users, setUsers] = useState<User[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>(initialParticipantIds)
  const [title, setTitle] = useState(initialTitle)
  const [search, setSearch] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const loadUsers = async () => {
      try {
        const data = await listUsers()
        setUsers(data)
      } catch (err) {
        setError("Unable to load users. Please try again.")
      }
    }
    loadUsers()
  }, [isOpen])

  const participantKey = useMemo(() => initialParticipantIds.join(","), [initialParticipantIds])
  const normalizedInitialParticipants = useMemo(
    () => initialParticipantIds,
    [participantKey],
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(normalizedInitialParticipants)
      setTitle(initialTitle)
      setSearch("")
      setError(null)
    }
  }, [isOpen, initialTitle, participantKey, normalizedInitialParticipants])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const lowered = search.toLowerCase()
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(lowered) ||
        (user.display_name ?? "").toLowerCase().includes(lowered),
    )
  }, [users, search])

  const toggleSelection = (userId: number) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError("Choose at least one participant.")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({ title, participantIds: selectedIds })
      onClose()
    } catch (err) {
      setError(mode === "create" ? "Failed to create conversation." : "Failed to update conversation.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null
  const portalTarget = typeof document !== "undefined" ? document.body : null
  if (!portalTarget) return null

  const headerTitle = mode === "create" ? "Start a conversation" : "Manage conversation"
  const headerSubtitle =
    mode === "create"
      ? "Select one or more teammates. Add a title for group chats."
      : "Update the participant list or change the group title."
  const submitLabel = isSubmitting
    ? mode === "create"
      ? "Creating..."
      : "Saving..."
    : mode === "create"
      ? "Create conversation"
      : "Save changes"

  return createPortal(
    <Fragment>
      <div className="fixed inset-0 z-[90] bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl rounded-[32px] border border-white/60 bg-white/95 p-8 text-slate-900 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
          <header className="mb-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">livewire</p>
            <h2 className="text-2xl font-bold text-slate-900">{headerTitle}</h2>
            <p className="text-sm text-slate-500">{headerSubtitle}</p>
          </header>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600">Group title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional (used for groups)"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600">Search users</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email or name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-3xl border border-slate-200 bg-white/80 shadow-inner">
              {filteredUsers.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No users found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id)
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => toggleSelection(user.id)}
                          className={`flex w-full items-center justify-between px-5 py-4 text-left text-sm transition ${
                            isSelected
                              ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{user.display_name ?? user.email}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                          <span
                            className={`h-5 w-5 rounded-full border ${
                              isSelected ? "border-indigo-400 bg-indigo-400" : "border-slate-300"
                            }`}
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
          {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </Fragment>,
    portalTarget,
  )
}
