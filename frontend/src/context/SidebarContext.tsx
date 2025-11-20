import { createContext, useContext, type ReactNode } from "react"

type SidebarContextValue = {
  setSidebarContent: (content: ReactNode | null) => void
  isSidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export const SidebarProvider = SidebarContext.Provider

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
