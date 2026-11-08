"use client"

import React from "react"
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { QueryProvider } from "@/components/providers/query-provider"
import { FilterProvider } from "@/components/providers/filter-context"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { desktopCollapsed } = useSidebar()

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar Desktop com largura dinâmica e transição suave */}
      <div 
        className={`hidden border-r bg-muted/40 sm:block sm:fixed sm:inset-y-0 sm:z-20 transition-all duration-200 ${
          desktopCollapsed ? 'sm:w-16' : 'sm:w-64'
        }`}
      >
        <Sidebar isMobile={false} />
      </div>

      {/* Conteúdo Principal com padding dinâmico */}
      <div 
        className={`flex flex-col transition-all duration-200 ${
          desktopCollapsed ? 'sm:pl-16' : 'sm:pl-64'
        }`}
      >
        <Header />
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <FilterProvider>
        <SidebarProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SidebarProvider>
      </FilterProvider>
    </QueryProvider>
  )
}
