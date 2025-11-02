import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"

import { createConversation, listConversations, listMessages, sendMessage, updateConversation } from "../api/chat"
import { ConversationModal } from "../components/CreateConversationModal"
import { useAuth } from "../context/AuthContext"
import type { Conversation, Message } from "../types"

export const ChatPage = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [composerValue, setComposerValue] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const messageListRef = useRef<HTMLDivElement | null>(null)

  const fetchConversations = useCallback(
    async (selectLatest = false) => {
      try {
        const data = await listConversations()
        setConversations(data)
        if (selectLatest && data.length > 0) {
          setSelectedConversationId(data[0].id)
        } else if (!selectedConversationId && data.length > 0) {
          setSelectedConversationId(data[0].id)
        }
      } catch (err) {
        setError("Failed to load conversations.")
      }
    },
    [selectedConversationId],
  )

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

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
      setMessages((prev) => [...prev, newMessage])
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
      setSelectedConversationId(newConversation.id)
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
      setSelectedConversationId(updatedConversation.id)
    },
    [fetchConversations, selectedConversation, user],
  )

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
      }
    })
  }

  const renderConversationTitle = (conversation: Conversation) => {
    if (conversation.title) return conversation.title
    const otherParticipants = conversation.participants.filter((participant) => participant.id !== user?.id)
    if (otherParticipants.length === 0) return "You"
    return otherParticipants.map((participant) => participant.display_name ?? participant.email).join(", ")
  }

  return (
    <div className="flex h-full">
      <section className="flex w-80 flex-col border-r border-slate-800 bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <h2 className="text-lg font-semibold text-white">Conversations</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded bg-cyan-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            New
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId
                return (
                  <li key={conversation.id}>
                    <button
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full px-4 py-3 text-left transition ${
                        isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70"
                      }`}
                    >
                      <p className="truncate text-sm font-medium">{renderConversationTitle(conversation)}</p>
                      <p className="truncate text-xs text-slate-400">
                        {new Date(conversation.updated_at).toLocaleString()}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
      <section className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            <header className="border-b border-slate-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {renderConversationTitle(selectedConversation)}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {selectedConversation.participants.length} participant
                    {selectedConversation.participants.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Manage
                </button>
              </div>
            </header>
            <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-950 px-6 py-4">
              {isLoadingMessages ? (
                <p className="text-sm text-slate-400">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-400">No messages yet.</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender.id === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-md rounded-lg px-4 py-2 text-sm ${
                        message.sender.id === user?.id ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-100"
                      }`}
                    >
                      {message.sender.id !== user?.id && (
                        <p className="mb-1 text-xs font-semibold text-cyan-300">
                          {message.sender.display_name ?? message.sender.email}
                        </p>
                      )}
                      <p>{message.body}</p>
                      <p className="mt-1 text-right text-[11px] text-slate-300">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {message.is_edited ? " • edited" : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <footer className="border-t border-slate-800 bg-slate-900 px-6 py-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input
                  type="text"
                  required
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Send
                </button>
              </form>
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-950 text-slate-400">
            Select a conversation to start chatting.
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
