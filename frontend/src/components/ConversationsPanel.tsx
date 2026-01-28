import { useMemo, useState } from "react"
import { FiSearch } from "react-icons/fi"

import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import type { Conversation } from "../types"

type ConversationsPanelProps = {
  conversations: Conversation[]
  selectedConversationId: number | null
  onSelectConversation: (conversationId: number) => void
  onOpenCreateModal: () => void
  renderConversationTitle: (conversation: Conversation) => string
  typingIndicators?: Record<number, string>
}

export const ConversationsPanel = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenCreateModal,
  renderConversationTitle,
  typingIndicators = {},
}: ConversationsPanelProps) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [search, setSearch] = useState("")
  const [showGroupsOnly, setShowGroupsOnly] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredConversations = useMemo(() => {
    let list = conversations
    if (showGroupsOnly) {
      list = list.filter((conversation) => conversation.is_group)
    }
    if (showUnreadOnly) {
      list = list.filter((conversation) => (conversation.unread_count ?? 0) > 0)
    }
    if (!search.trim()) return list
    const query = search.toLowerCase()
    return list.filter((conversation) => {
      const title = renderConversationTitle(conversation).toLowerCase()
      const participantMatch = conversation.participants.some((participant) => {
        const candidate = participant.display_name ?? participant.email
        return candidate.toLowerCase().includes(query)
      })
      return title.includes(query) || participantMatch
    })
  }, [conversations, renderConversationTitle, search, showGroupsOnly, showUnreadOnly])

  const formatRelativeTime = (timestamp: string) => {
    const now = Date.now()
    const value = new Date(timestamp).getTime()
    const diffMs = now - value
    const minutes = Math.floor(diffMs / (1000 * 60))
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const getConversationPreview = (conversation: Conversation) => {
    if (conversation.is_group) {
      return `${conversation.participants.length} participants`
    }
    const other = conversation.participants.find((participant) => participant.id !== user?.id)
    const fallback = conversation.participants[0]
    return other
      ? other.display_name ?? other.email
      : fallback
        ? fallback.display_name ?? fallback.email
        : "Direct message"
  }

  const getConversationInitials = (conversation: Conversation) => {
    const title = renderConversationTitle(conversation).trim()
    if (!title) return "LW"
    const words = title.split(" ").filter(Boolean)
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  const emptyStateText = isDark ? "text-slate-300" : "text-slate-500"
  const listHeight = "calc(100vh - 460px)"

  return (
    <section className="flex min-h-0 flex-col gap-5 overflow-hidden p-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-300">
              inbox
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conversations</h2>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg transition hover:shadow-xl"
          >
            New
          </button>
        </div>
        <div className="space-y-2">
          <label className="relative block">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <FiSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-2xl border border-white/40 bg-white/90 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowGroupsOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur ${
                showGroupsOnly
                  ? "border-white/70 bg-white/40 text-indigo-600 shadow-lg dark:border-white/20 dark:bg-slate-900/50 dark:text-indigo-300"
                  : "border-white/30 bg-white/15 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200"
              }`}
            >
              Groups
              {showGroupsOnly && (
                <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-600 dark:text-indigo-200">
                  ON
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur ${
                showUnreadOnly
                  ? "border-white/70 bg-white/40 text-indigo-600 shadow-lg dark:border-white/20 dark:bg-slate-900/50 dark:text-indigo-300"
                  : "border-white/30 bg-white/15 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200"
              }`}
            >
              Unread
              {showUnreadOnly && (
                <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-600 dark:text-indigo-200">
                  ON
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <div className="scrollbar-hidden flex-1 min-h-0 overflow-y-auto pr-1" style={{ maxHeight: listHeight }}>
        {filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/60 bg-white/70 px-6 py-10 text-center dark:border-white/10 dark:bg-slate-900/70">
            <p className={`text-sm font-medium ${emptyStateText}`}>No conversations found.</p>
            <p className={`mt-1 text-xs ${emptyStateText}`}>Start a new thread or adjust your search.</p>
          </div>
        ) : (
          <ul className={`space-y-3`}>
            {filteredConversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId
              const title = renderConversationTitle(conversation)
              const otherParticipant = !conversation.is_group
                ? conversation.participants.find((participant) => participant.id !== user?.id) ??
                  conversation.participants[0]
                : null
              const isOtherOnline = !!otherParticipant?.is_online
              const unreadCount = conversation.unread_count ?? 0
              return (
                <li key={conversation.id}>
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`group flex w-full items-center gap-3 rounded-3xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xl"
                        : "border-white/60 bg-white/80 text-slate-900 shadow-sm hover:border-indigo-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-semibold uppercase ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-gradient-to-br from-indigo-200 to-purple-200 text-slate-900 dark:from-slate-700 dark:to-slate-800 dark:text-white"
                        }`}
                      >
                        {getConversationInitials(conversation)}
                      </div>
                      {!conversation.is_group && (
                        <span
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 ${
                            isActive ? "border-white/80" : "border-white"
                          } ${isOtherOnline ? "bg-emerald-400" : "bg-slate-400"}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-base font-semibold">{title}</p>
                        <span
                          className={`flex-shrink-0 text-xs ${
                            isActive ? "text-white/80" : "text-slate-500 dark:text-slate-300"
                          }`}
                        >
                          {formatRelativeTime(conversation.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`truncate text-sm ${
                            typingIndicators[conversation.id]
                              ? "text-indigo-600 dark:text-indigo-300"
                              : isActive
                                ? "text-white/90"
                                : "text-slate-500 dark:text-slate-300"
                          }`}
                        >
                          {typingIndicators[conversation.id] ?? getConversationPreview(conversation)}
                        </p>
                        {unreadCount > 0 && (
                          <span
                            className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-2 text-[11px] font-semibold ${
                              isActive
                                ? "bg-white text-indigo-600"
                                : "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-900"
                            }`}
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
