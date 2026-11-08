"use client"

import { Menu, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Sidebar } from "./sidebar"
import { useSidebar } from "./sidebar-context"

export function Header() {
  const { mobileOpen, setMobileOpen, desktopCollapsed, toggleDesktopSidebar } = useSidebar()

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
          <nav className="h-full">
            <Sidebar isMobile={true} />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center justify-end space-x-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
