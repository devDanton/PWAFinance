"use client"

import { useState } from "react"
import { Menu, PanelLeftClose, PanelLeft, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Sidebar } from "./sidebar"
import { useSidebar } from "./sidebar-context"
import { useInvalidateData } from "@/hooks/use-finance-queries"
import { useRouter } from "next/navigation"

export function Header() {
  const { mobileOpen, setMobileOpen, desktopCollapsed, toggleDesktopSidebar } = useSidebar()
  const { invalidateAll } = useInvalidateData()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function handleRefresh() {
    try {
      setIsRefreshing(true)
      await invalidateAll()
      router.refresh()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Botão de Toggle do Menu Mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden h-9 w-9">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <nav className="h-full">
            <Sidebar isMobile={true} />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center justify-end space-x-2">
        {/* Botão de Sincronização / Recarregar Cache */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Sincronizar e atualizar dados"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          <span className="sr-only">Sincronizar dados</span>
        </Button>

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
