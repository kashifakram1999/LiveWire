import { apiClient } from "./client"
import type { Conversation, Message } from "../types"

export const listConversations = async (): Promise<Conversation[]> => {
  const { data } = await apiClient.get<Conversation[]>("/chat/conversations/")
  return data
}

export const createConversation = async (payload: {
  title?: string
  participant_ids: number[]
  is_group?: boolean
}) => {
  const { data } = await apiClient.post<Conversation>("/chat/conversations/", payload)
  return data
}

export const updateConversation = async (
  conversationId: number,
  payload: { title?: string; participant_ids: number[]; is_group?: boolean },
) => {
  const { data } = await apiClient.patch<Conversation>(`/chat/conversations/${conversationId}/`, payload)
  return data
}

export const listMessages = async (conversationId: number): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>(`/chat/conversations/${conversationId}/messages/`)
  return data
}

export const sendMessage = async (conversationId: number, payload: { body: string }) => {
  const { data } = await apiClient.post<Message>(`/chat/conversations/${conversationId}/messages/`, payload)
  return data
}
