import { Fragment, useEffect, useMemo, useState } from "react"

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

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialParticipantIds)
      setTitle(initialTitle)
      setSearch("")
      setError(null)
    }
  }, [isOpen, initialParticipantIds, initialTitle])

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

  return (
    <Fragment>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
            <p className="text-sm text-slate-400">{headerSubtitle}</p>
          </header>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Group title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional (used for groups)"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Search users</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email or name"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded border border-slate-800 bg-slate-950">
              {filteredUsers.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400">No users found.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id)
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => toggleSelection(user.id)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                            isSelected ? "bg-cyan-500/20 text-white" : "text-slate-300 hover:bg-slate-800/70"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {user.display_name ?? user.email}
                            </p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                          <span
                            className={`h-4 w-4 rounded-full border ${
                              isSelected ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
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
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  )
}
