"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextType {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  desktopCollapsed: boolean
  setDesktopCollapsed: (collapsed: boolean) => void
  toggleDesktopSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  // Persistir preferência do desktop no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pwafinance_sidebar_collapsed")
      if (saved !== null) {
        setDesktopCollapsed(saved === "true")
      }
    } catch {}
  }, [])

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("pwafinance_sidebar_collapsed", String(next))
      } catch {}
      return next
    })
  }

  const closeMobileSidebar = () => {
    setMobileOpen(false)
  }

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        desktopCollapsed,
        setDesktopCollapsed,
        toggleDesktopSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar deve ser usado dentro de um SidebarProvider")
  }
  return context
}
