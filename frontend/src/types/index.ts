export type User = {
  id: number
  email: string
  display_name: string | null
  avatar_url: string | null
  is_email_verified: boolean
  date_joined: string
}

export type AuthResponse = {
  refresh: string
  access: string
  user: User
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
  password_confirm: string
  display_name?: string
  avatar_url?: string
}

export type Conversation = {
  id: number
  title: string
  is_group: boolean
  created_at: string
  updated_at: string
  participants: User[]
}

export type Message = {
  id: number
  conversation: number
  sender: User
  body: string
  attachment_url: string | null
  created_at: string
  updated_at: string
  is_edited: boolean
}
