import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FiSend } from "react-icons/fi"
import type { ChangeEvent, FormEvent } from "react"

import {
  createConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  updateConversation,
} from "../api/chat"
import { ConversationsPanel } from "../components/ConversationsPanel"
import { ConversationModal } from "../components/CreateConversationModal"
import { updatePresence } from "../api/users"
import { useAuth } from "../context/AuthContext"
import { useSidebar } from "../context/SidebarContext"
import { useTheme } from "../context/ThemeContext"
import type { Conversation, ConversationParticipantState, Message } from "../types"

type TypingPayload = {
  user_id: number
  display_name?: string | null
  is_typing: boolean
  client_id?: string
}

type ReadReceiptPayload = {
  user_id: number
  last_seen_at: string
}

type RealtimePayload =
  | {
      kind: "message"
      conversation: number
      data: Message
    }
  | {
      kind: "typing"
      conversation: number
      data: TypingPayload
    }
  | {
      kind: "read_receipt"
      conversation: number
      data: ReadReceiptPayload
    }
  | {
      kind: string
      conversation: number
      data?: unknown
    }

const SELECTED_CONVERSATION_STORAGE_KEY = "livewire:selectedConversationId"

export const ChatPage = () => {
  const { user } = useAuth()
  const { setSidebarContent, closeSidebar, toggleSidebar } = useSidebar()
  const { theme } = useTheme()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationIdState, setSelectedConversationIdState] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const stored = window.localStorage.getItem(SELECTED_CONVERSATION_STORAGE_KEY)
    if (!stored) return null
    const parsed = Number(stored)
    return Number.isFinite(parsed) ? parsed : null
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [composerValue, setComposerValue] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [typingStates, setTypingStates] = useState<Record<number, Record<number, string>>>({})
  const manualSelectionClearedRef = useRef(false)
  const selectedConversationId = selectedConversationIdState
  const updateSelectedConversationId = useCallback(
    (conversationId: number | null, options?: { manualClear?: boolean }) => {
      setSelectedConversationIdState(conversationId)
      if (conversationId === null) {
        manualSelectionClearedRef.current = options?.manualClear ?? false
      } else {
        manualSelectionClearedRef.current = false
      }
    },
    [],
  )
  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), [])
  const handleSelectConversation = useCallback(
    (conversationId: number) => {
      updateSelectedConversationId(conversationId)
      closeSidebar()
    },
    [closeSidebar, updateSelectedConversationId],
  )
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const conversationWatchersRef = useRef<Record<number, WebSocket>>({})
  const typingTimeoutsRef = useRef<Record<number, Record<number, ReturnType<typeof setTimeout>>>>({})
  const typingThrottleRef = useRef<number>(0)
  const markReadInFlightRef = useRef<Record<number, boolean>>({})
  const TYPING_THROTTLE_MS = 1200
  const clientIdRef = useRef<string>("")
  if (!clientIdRef.current) {
    const randomId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    clientIdRef.current = randomId
  }

  const resolveWebSocketUrl = useCallback((conversationId: number) => {
    const rawBase = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8000"
    let baseUrl: URL
    try {
      baseUrl = new URL(rawBase)
    } catch {
      baseUrl = new URL("http://localhost:8000")
    }
    const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${baseUrl.host}/ws/chat/${conversationId}/`
  }, [])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
      }
    })
  }, [])

  const markConversationAsRead = useCallback(
    async (conversationId: number) => {
      if (!user) return
      if (markReadInFlightRef.current[conversationId]) return
      markReadInFlightRef.current[conversationId] = true
      try {
        const updatedConversation = await markConversationRead(conversationId)
        setConversations((prev) => {
          const exists = prev.some((conversation) => conversation.id === conversationId)
          if (!exists) return prev
          const next = prev.map((conversation) =>
            conversation.id === conversationId ? updatedConversation : conversation,
          )
          next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          return next
        })
      } catch (error) {
        // Ignore read acknowledgement failures to avoid interrupting messaging.
      } finally {
        markReadInFlightRef.current[conversationId] = false
      }
    },
    [user],
  )

  const applyIncomingMessageToConversations = useCallback(
    (incoming: Message) => {
      setConversations((prev) => {
        const updated = prev.map((conversation) => {
          if (conversation.id !== incoming.conversation) return conversation
          const currentUnread = conversation.unread_count ?? 0
          const shouldIncrement =
            incoming.sender.id !== user?.id && incoming.conversation !== selectedConversationId
          return {
            ...conversation,
            updated_at: incoming.created_at,
            unread_count: shouldIncrement ? currentUnread + 1 : currentUnread,
          }
        })
        updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        return updated
      })
    },
    [selectedConversationId, user?.id],
  )

  const handleIncomingRealtimeMessage = useCallback(
    (incoming: Message) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex((message) => message.id === incoming.id)
        if (existingIndex !== -1) {
          const updated = [...prev]
          updated[existingIndex] = incoming
          return updated
        }
        return [...prev, incoming]
      })
      applyIncomingMessageToConversations(incoming)
      if (incoming.sender.id !== user?.id && incoming.conversation === selectedConversationId) {
        markConversationAsRead(incoming.conversation)
      }
      scrollToBottom()
    },
    [applyIncomingMessageToConversations, markConversationAsRead, scrollToBottom, selectedConversationId, user?.id],
  )

  const clearTypingUser = useCallback((conversationId: number, userId: number) => {
    setTypingStates((prev) => {
      const conversationTyping = prev[conversationId]
      if (!conversationTyping || !(userId in conversationTyping)) return prev
      const conversationUpdated = { ...conversationTyping }
      delete conversationUpdated[userId]
      const next = { ...prev }
      if (Object.keys(conversationUpdated).length > 0) {
        next[conversationId] = conversationUpdated
      } else {
        delete next[conversationId]
      }
      return next
    })
  }, [])

  const handleTypingEvent = useCallback(
    (conversationId: number, payload: TypingPayload) => {
      if (!payload || payload.client_id === clientIdRef.current) return
      const userId = payload.user_id
      const timersForConversation =
        typingTimeoutsRef.current[conversationId] ?? (typingTimeoutsRef.current[conversationId] = {})

      if (payload.is_typing) {
        setTypingStates((prev) => {
          const conversationTyping = prev[conversationId] ?? {}
          return {
            ...prev,
            [conversationId]: {
              ...conversationTyping,
              [userId]: payload.display_name ?? "Someone",
            },
          }
        })
        const existingTimer = timersForConversation[userId]
        if (existingTimer) clearTimeout(existingTimer)
        timersForConversation[userId] = window.setTimeout(() => {
          clearTypingUser(conversationId, userId)
          delete timersForConversation[userId]
          if (Object.keys(timersForConversation).length === 0) {
            delete typingTimeoutsRef.current[conversationId]
          }
        }, 3000)
      } else {
        const existingTimer = timersForConversation[userId]
        if (existingTimer) {
          clearTimeout(existingTimer)
          delete timersForConversation[userId]
          if (Object.keys(timersForConversation).length === 0) {
            delete typingTimeoutsRef.current[conversationId]
          }
        }
        clearTypingUser(conversationId, userId)
      }
    },
    [clearTypingUser],
  )

  const handleReadReceiptEvent = useCallback(
    (conversationId: number, payload: ReadReceiptPayload) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation
          const states = conversation.participant_states ?? []
          const targetIndex = states.findIndex((state) => state.user_id === payload.user_id)
          if (targetIndex === -1) return conversation
          const updatedStates: ConversationParticipantState[] = [...states]
          updatedStates[targetIndex] = {
            ...updatedStates[targetIndex],
            last_seen_at: payload.last_seen_at,
          }
          const shouldResetUnread = payload.user_id === user?.id
          const updatedParticipants = conversation.participants.map((participant) =>
            participant.id === payload.user_id
              ? {
                  ...participant,
                  last_active_at: payload.last_seen_at,
                  is_online: true,
                }
              : participant,
          )
          return {
            ...conversation,
            participant_states: updatedStates,
            unread_count: shouldResetUnread ? 0 : conversation.unread_count,
            participants: updatedParticipants,
          }
        }),
      )
    },
    [user?.id],
  )

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      if (!user || !selectedConversationId) return
      const payload = {
        kind: "typing",
        conversation: selectedConversationId,
        data: {
          user_id: user.id,
          display_name: user.display_name ?? user.email,
          is_typing: isTyping,
          client_id: clientIdRef.current,
        },
      }
      wsRef.current.send(JSON.stringify(payload))
    },
    [selectedConversationId, user],
  )

  const fetchConversations = useCallback(
    async (selectLatest = false) => {
      try {
        const data = await listConversations()
        setConversations(data)
        if (selectLatest && data.length > 0) {
          updateSelectedConversationId(data[0].id)
          return
        }
        if (selectedConversationId !== null) {
          const exists = data.some((conversation) => conversation.id === selectedConversationId)
          if (!exists) {
            if (data.length > 0) {
              updateSelectedConversationId(data[0].id)
            } else {
              updateSelectedConversationId(null)
            }
          }
        } else if (data.length > 0 && !manualSelectionClearedRef.current) {
          updateSelectedConversationId(data[0].id)
        } else if (data.length === 0) {
          updateSelectedConversationId(null)
        }
      } catch (err) {
        setError("Failed to load conversations.")
      }
    },
    [selectedConversationId, updateSelectedConversationId],
  )

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!user) return
    let intervalId: number | undefined
    const touchPresence = async () => {
      try {
        await updatePresence()
      } catch (err) {
        // Presence updates are best-effort; ignore failures.
      }
    }
    touchPresence()
    if (typeof window !== "undefined") {
      intervalId = window.setInterval(() => {
        touchPresence()
      }, 30000)
    }
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedConversationId === null) {
      window.localStorage.removeItem(SELECTED_CONVERSATION_STORAGE_KEY)
    } else {
      window.localStorage.setItem(SELECTED_CONVERSATION_STORAGE_KEY, String(selectedConversationId))
    }
  }, [selectedConversationId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedConversationId !== null) {
        updateSelectedConversationId(null, { manualClear: true })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedConversationId, updateSelectedConversationId])

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach((conversationTimers) => {
        Object.values(conversationTimers).forEach((timerId) => clearTimeout(timerId))
      })
    }
  }, [])

  useEffect(() => {
    typingThrottleRef.current = 0
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return

    const fetchMessages = async () => {
      setIsLoadingMessages(true)
      setError(null)
      try {
        const data = await listMessages(selectedConversationId)
        setMessages(data)
        scrollToBottom()
      } catch (err) {
        setError("Failed to load messages.")
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return
    markConversationAsRead(selectedConversationId)
  }, [selectedConversationId, markConversationAsRead])

  useEffect(() => {
    if (!selectedConversationId || messages.length === 0) return
    markConversationAsRead(selectedConversationId)
  }, [messages, selectedConversationId, markConversationAsRead])

  useEffect(() => {
    if (!selectedConversationId) return

    const socketUrl = resolveWebSocketUrl(selectedConversationId)
    const socket = new WebSocket(socketUrl)
    wsRef.current = socket

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as RealtimePayload
        if (!payload || typeof payload !== "object" || payload.conversation !== selectedConversationId) {
          return
        }
        if (payload.kind === "message" && payload.data) {
          handleIncomingRealtimeMessage(payload.data as Message)
        } else if (payload.kind === "typing" && payload.data) {
          handleTypingEvent(payload.conversation, payload.data as TypingPayload)
        } else if (payload.kind === "read_receipt" && payload.data) {
          handleReadReceiptEvent(payload.conversation, payload.data as ReadReceiptPayload)
        }
      } catch (parseError) {
        console.error("Unable to parse websocket payload", parseError)
      }
    }

    socket.onerror = (event) => {
      console.error("WebSocket error", event)
    }

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null
      }
    }

    return () => {
      socket.close()
    }
  }, [
    handleIncomingRealtimeMessage,
    handleReadReceiptEvent,
    handleTypingEvent,
    resolveWebSocketUrl,
    selectedConversationId,
  ])

  useEffect(() => {
    const watcherSockets = conversationWatchersRef.current
    const desiredConversationIds = new Set(
      conversations.map((conversation) => conversation.id).filter((conversationId) => conversationId !== selectedConversationId),
    )

    Object.entries(watcherSockets).forEach(([conversationIdString, socket]) => {
      const conversationId = Number(conversationIdString)
      if (!desiredConversationIds.has(conversationId)) {
        socket.close()
        delete watcherSockets[conversationId]
      }
    })

    desiredConversationIds.forEach((conversationId) => {
      if (watcherSockets[conversationId]) return
      const socket = new WebSocket(resolveWebSocketUrl(conversationId))
      watcherSockets[conversationId] = socket

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as RealtimePayload
          if (!payload || typeof payload !== "object" || payload.conversation !== conversationId) {
            return
          }
          if (payload.kind === "message" && payload.data) {
            applyIncomingMessageToConversations(payload.data as Message)
          } else if (payload.kind === "typing" && payload.data) {
            handleTypingEvent(conversationId, payload.data as TypingPayload)
          } else if (payload.kind === "read_receipt" && payload.data) {
            handleReadReceiptEvent(conversationId, payload.data as ReadReceiptPayload)
          }
        } catch (error) {
          console.error("Unable to parse watcher payload", error)
        }
      }

      socket.onerror = (event) => {
        console.error("Conversation watcher WebSocket error", event)
      }

      socket.onclose = () => {
        if (conversationWatchersRef.current[conversationId] === socket) {
          delete conversationWatchersRef.current[conversationId]
        }
      }
    })
  }, [
    applyIncomingMessageToConversations,
    conversations,
    handleReadReceiptEvent,
    handleTypingEvent,
    resolveWebSocketUrl,
    selectedConversationId,
  ])

  useEffect(() => {
    return () => {
      Object.values(conversationWatchersRef.current).forEach((socket) => socket.close())
    }
  }, [])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedConversationId || !composerValue.trim()) return

    const pendingMessage = composerValue
    setComposerValue("")
    try {
      const newMessage = await sendMessage(selectedConversationId, { body: pendingMessage })
      setMessages((prev) => {
        const existingIndex = prev.findIndex((message) => message.id === newMessage.id)
        if (existingIndex !== -1) {
          const updated = [...prev]
          updated[existingIndex] = newMessage
          return updated
        }
        return [...prev, newMessage]
      })
      setConversations((prev) => {
        const updated = prev.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, updated_at: newMessage.created_at }
            : conversation,
        )
        updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        return updated
      })
      scrollToBottom()
    } catch (err) {
      setError("Unable to send message.")
    } finally {
      typingThrottleRef.current = 0
      sendTypingStatus(false)
    }
  }

  const handleComposerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setComposerValue(value)
    if (value.trim().length === 0) {
      typingThrottleRef.current = 0
      sendTypingStatus(false)
      return
    }
    const now = Date.now()
    if (now - typingThrottleRef.current >= TYPING_THROTTLE_MS) {
      typingThrottleRef.current = now
      sendTypingStatus(true)
    }
  }

  const handleCreateConversation = useCallback(
    async (payload: { title: string; participantIds: number[] }) => {
      setError(null)
      const newConversation = await createConversation({
        title: payload.title || undefined,
        is_group: payload.participantIds.length > 1,
        participant_ids: payload.participantIds,
      })
      await fetchConversations(true)
      updateSelectedConversationId(newConversation.id)
      return newConversation
    },
    [fetchConversations],
  )

  const handleUpdateConversation = useCallback(
    async (payload: { title: string; participantIds: number[] }) => {
      if (!selectedConversation || !user) return
      setError(null)
      const participantSet = new Set<number>(payload.participantIds)
      participantSet.add(user.id)
      const participantIds = Array.from(participantSet)
      const updatedConversation = await updateConversation(selectedConversation.id, {
        title: payload.title || undefined,
        is_group: participantIds.length > 2,
        participant_ids: participantIds,
      })
      await fetchConversations()
      updateSelectedConversationId(updatedConversation.id)
    },
    [fetchConversations, selectedConversation, user],
  )

  const renderConversationTitle = useCallback(
    (conversation: Conversation) => {
      if (conversation.title) return conversation.title
      const otherParticipants = conversation.participants.filter((participant) => participant.id !== user?.id)
      if (otherParticipants.length === 0) return "You"
      return otherParticipants.map((participant) => participant.display_name ?? participant.email).join(", ")
    },
    [user?.id],
  )

  const getUserInitials = useCallback((displayName: string | null, email: string) => {
    const basis = (displayName ?? email).trim()
    const words = basis.split(/\s+/).filter(Boolean)
    if (words.length === 0) return "LW"
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }, [])

  const typingUsersForSelected = selectedConversationId ? typingStates[selectedConversationId] ?? {} : {}
  const typingUserEntries = Object.entries(typingUsersForSelected)
  const typingIndicatorMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    Object.entries(typingStates).forEach(([conversationId, typingMap]) => {
      const entries = Object.values(typingMap)
      if (entries.length > 0) {
        map[Number(conversationId)] = `${entries.join(", ")} ${entries.length > 1 ? "are" : "is"} typing...`
      }
    })
    return map
  }, [typingStates])

  const sidebarContent = useMemo(
    () => (
      <ConversationsPanel
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onOpenCreateModal={openCreateModal}
        renderConversationTitle={renderConversationTitle}
        typingIndicators={typingIndicatorMap}
      />
    ),
    [
      conversations,
      selectedConversationId,
      handleSelectConversation,
      openCreateModal,
      renderConversationTitle,
      typingIndicatorMap,
    ],
  )

  useEffect(() => {
    setSidebarContent(sidebarContent)
  }, [setSidebarContent, sidebarContent])

  useEffect(() => {
    return () => {
      setSidebarContent(null)
    }
  }, [setSidebarContent])

  const isDark = theme === "dark"
  const detailText = isDark ? "text-slate-300" : "text-slate-500"
  const toggleButtonClasses = isDark
    ? "border-white/20 text-white hover:bg-white/10"
    : "border-slate-200 text-slate-700 hover:bg-white"
  const manageButtonClasses = isDark
    ? "border-white/20 text-white hover:bg-white/10"
    : "border-slate-200 text-slate-700 hover:bg-white"
  const messagePanelClasses = isDark
    ? "border border-white/15 bg-gradient-to-b from-[#070d1d] via-[#050915] to-[#03060d]"
    : "border border-indigo-50 bg-gradient-to-b from-[#f5f4ff] via-white to-white shadow-[0_25px_70px_rgba(84,70,193,0.18)]"
  const composerBackground = isDark
    ? "bg-slate-900/80"
    : "bg-gradient-to-r from-white via-[#f9f7ff] to-white"
  const composerInput = isDark
    ? "border-white/15 bg-slate-950/70 text-white placeholder:text-slate-400"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
  const otherMessageClasses = isDark
    ? "bg-slate-900/70 border border-white/10 text-white"
    : "bg-white border border-indigo-50 text-slate-900 shadow-[0_12px_40px_rgba(86,72,191,0.12)]"
  const composerShellClasses = isDark
    ? "border border-white/15 bg-slate-900/60 text-white ring-white/10"
    : "border border-indigo-50 bg-white/95 text-slate-900 ring-indigo-50"
  const footerBorderClass = isDark ? "border-white/10" : "border-indigo-50"
  const headerBorderClass = isDark ? "border-white/15" : "border-indigo-50"

  const participantSummary = selectedConversation
    ? `${selectedConversation.participants.length} participant${
        selectedConversation.participants.length !== 1 ? "s" : ""
      }`
    : ""

  const formatRelativeMoment = useCallback((timestamp: string) => {
    const now = Date.now()
    const when = new Date(timestamp).getTime()
    const diffMs = now - when
    const minutes = Math.floor(diffMs / (1000 * 60))
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "yesterday"
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }, [])

  const presenceStatus = useMemo(() => {
    if (!selectedConversation || selectedConversation.is_group) return ""
    const other = selectedConversation.participants.find((participant) => participant.id !== user?.id)
    if (!other) return ""
    if (other.is_online) return "Online"
    if (other.last_active_at) {
      return `Last active ${formatRelativeMoment(other.last_active_at)}`
    }
    return ""
  }, [formatRelativeMoment, selectedConversation, user?.id])

  const headerMeta = [participantSummary, presenceStatus].filter(Boolean).join(" • ")

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <section className="flex flex-1 flex-col min-h-0">
        {selectedConversation ? (
          <>
            <header
              className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 text-slate-900 dark:text-white ${headerBorderClass}`}
            >
              <div className="flex flex-1 items-center gap-4">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold uppercase md:hidden ${toggleButtonClasses}`}
                  aria-label="Toggle conversations"
                >
                  <span className="sr-only">Toggle conversations</span>
                  <span className="flex flex-col items-center justify-center space-y-1">
                    <span className={`block h-0.5 w-5 ${isDark ? "bg-white" : "bg-slate-700"}`} />
                    <span className={`block h-0.5 w-5 ${isDark ? "bg-white" : "bg-slate-700"}`} />
                    <span className={`block h-0.5 w-5 ${isDark ? "bg-white" : "bg-slate-700"}`} />
                  </span>
                </button>
                <div className="flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-300">
                    live conversation
                  </p>
                  <h2 className="text-2xl font-bold">{renderConversationTitle(selectedConversation)}</h2>
                  <p className={`text-sm ${detailText}`}>{headerMeta || participantSummary}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-wide ${manageButtonClasses}`}
              >
                Manage
              </button>
            </header>
            <div className="relative flex-1 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
              <div
                ref={messageListRef}
                className={`absolute inset-0 space-y-5 overflow-y-auto px-4 py-6 sm:px-8 ${messagePanelClasses}`}
              >
                {isLoadingMessages ? (
                  <p className={`text-sm ${detailText}`}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className={`text-base font-semibold ${detailText}`}>No messages yet.</p>
                    <p className={`mt-1 text-sm ${detailText}`}>Be the first to say hello.</p>
                    {typingUserEntries.length > 0 && (
                      <div className="mt-6 w-full space-y-4">
                        {typingUserEntries.map(([userId, name]) => (
                          <div key={`typing-empty-${userId}`} className="flex items-end gap-3 justify-start">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-200 to-purple-200 text-xs font-semibold text-slate-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                              {getUserInitials(name, name)}
                            </div>
                            <div
                              className={`max-w-[75%] rounded-[26px] px-5 py-3 text-sm leading-relaxed shadow-lg ${otherMessageClasses}`}
                            >
                              <p className="mb-1 text-xs font-semibold text-indigo-500 dark:text-indigo-200">{name}</p>
                              <p className={`text-xs italic ${detailText}`}>typing...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const isOwnMessage = message.sender.id === user?.id
                      const seenByEveryone =
                        isOwnMessage &&
                        !!selectedConversation &&
                        selectedConversation.participant_states
                          .filter((state) => state.user_id !== user?.id)
                          .every(
                            (state) =>
                              state.last_seen_at &&
                              new Date(state.last_seen_at).getTime() >=
                                new Date(message.created_at).getTime(),
                          )
                      return (
                        <div
                          key={message.id}
                          className={`flex items-end gap-3 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          {!isOwnMessage && (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-200 to-purple-200 text-xs font-semibold text-slate-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                              {getUserInitials(message.sender.display_name, message.sender.email)}
                            </div>
                          )}
                          <div
                            className={`max-w-[75%] rounded-[26px] px-5 py-3 text-sm leading-relaxed shadow-lg ${
                              isOwnMessage
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-indigo-200/50"
                                : otherMessageClasses
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="mb-1 text-xs font-semibold text-indigo-300 dark:text-indigo-200">
                                {message.sender.display_name ?? message.sender.email}
                              </p>
                            )}
                            <p>{message.body}</p>
                            <p className={`mt-1 text-xs ${isOwnMessage ? "text-white/80" : detailText}`}>
                              {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {message.is_edited ? " • edited" : ""}
                              {seenByEveryone ? " • Seen" : ""}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {typingUserEntries.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {typingUserEntries.map(([userId, name]) => (
                          <div key={`typing-${userId}`} className="flex items-end gap-3 justify-start">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-200 to-purple-200 text-xs font-semibold text-slate-900 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                              {getUserInitials(name, name)}
                            </div>
                            <div
                              className={`max-w-[75%] rounded-[26px] px-5 py-3 text-sm leading-relaxed shadow-lg ${otherMessageClasses}`}
                            >
                              <p className="mb-1 text-xs font-semibold text-indigo-500 dark:text-indigo-200">{name}</p>
                              <p className={`text-xs italic ${detailText}`}>typing...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <footer className={`border-t px-4 py-5 sm:px-6 ${composerBackground} ${footerBorderClass}`}>
              <form
                onSubmit={handleSendMessage}
                className={`flex flex-col gap-3 rounded-[28px] p-3 shadow-xl ring-1 ${composerShellClasses}`}
              >
                <div className="flex items-center gap-3">
                  <div className="hidden rounded-full border border-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/20 dark:text-slate-300 md:flex md:items-center md:gap-2">
                    LiveWire
                  </div>
                  <input
                    type="text"
                    required
                    value={composerValue}
                    onChange={handleComposerChange}
                    onBlur={() => sendTypingStatus(false)}
                    placeholder="Type your message..."
                    className={`flex-1 rounded-full border px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 ${composerInput}`}
                  />
                  <button
                    type="submit"
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transition hover:shadow-xl"
                  >
                    <span className="sr-only">Send</span>
                    <FiSend className="h-5 w-5" />
                  </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-br from-white via-indigo-50 to-purple-50 p-8 text-center text-slate-600 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
            <p className="text-lg font-semibold">Select a conversation to start chatting.</p>
            <button
              type="button"
              onClick={toggleSidebar}
              className={`rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-wide md:hidden ${toggleButtonClasses}`}
            >
              Open conversations
            </button>
          </div>
        )}
      </section>
      <ConversationModal
        mode="create"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (payload) => {
          await handleCreateConversation(payload)
        }}
      />
      {selectedConversation && user && (
        <ConversationModal
          mode="edit"
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialTitle={selectedConversation.title}
          initialParticipantIds={selectedConversation.participants
            .filter((participant) => participant.id !== user.id)
            .map((participant) => participant.id)}
          onSubmit={async (payload) => {
            await handleUpdateConversation(payload)
          }}
        />
      )}
    </div>
  )
}
