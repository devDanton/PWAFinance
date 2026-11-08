"use client"

import Link from "next/link"
import { usePathname } from "@/i18n/routing"
import { LayoutDashboard, ReceiptText, CreditCard, Wallet, Users, Settings, Repeat, Tags, HandCoins, PanelLeftClose, PanelLeft } from "lucide-react"
import { useSidebar } from "./sidebar-context"
import { Button } from "@/components/ui/button"

export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname()
  const { desktopCollapsed, toggleDesktopSidebar, closeMobileSidebar } = useSidebar()

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Transações", href: "/transactions", icon: ReceiptText },
    { name: "Cartões", href: "/cards", icon: CreditCard },
    { name: "Acerto de Contas", href: "/reimbursements", icon: HandCoins },
    { name: "Assinaturas", href: "/subscriptions", icon: Repeat },
    { name: "Categorias", href: "/categories", icon: Tags },
    { name: "Pagadores", href: "/payers", icon: Users },
    { name: "Workspaces", href: "/workspaces", icon: Users },
    { name: "Configurações", href: "/settings", icon: Settings },
  ]

  const isCollapsed = !isMobile && desktopCollapsed

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Topo: Logo da Aplicação */}
      <div>
        <div className={`flex h-14 items-center border-b px-4 lg:h-[60px] ${isCollapsed ? 'justify-center px-2' : 'px-4 lg:px-6'}`}>
          {!isCollapsed ? (
            <Link 
              href="/" 
              className="flex items-center gap-2.5 font-semibold text-base"
              onClick={() => {
                if (isMobile) closeMobileSidebar()
              }}
            >
              <Wallet className="h-6 w-6 text-primary shrink-0" />
              <span className="truncate tracking-tight font-bold">PWAFinance</span>
            </Link>
          ) : (
            <Link 
              href="/" 
              className="flex items-center justify-center"
              title="PWAFinance"
            >
              <Wallet className="h-6 w-6 text-primary" />
            </Link>
          )}
        </div>

        {/* Lista de Navegação */}
        <div className="overflow-auto py-3">
          <nav className={`grid items-start gap-1 text-sm font-medium ${isCollapsed ? 'px-2' : 'px-2 lg:px-4'}`}>
            {navItems.map((item) => {
              const isActive = item.href === "/" 
                ? pathname === item.href 
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    if (isMobile) closeMobileSidebar()
                  }}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 rounded-lg py-2 transition-all hover:text-primary ${
                    isCollapsed ? 'justify-center px-2' : 'px-3'
                  } ${
                    isActive ? "bg-muted text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Rodapé da Sidebar: Botão de Recolher/Expandir */}
      {!isMobile && (
        <div className="p-2 border-t mt-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDesktopSidebar}
            title={desktopCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className={`w-full text-xs text-muted-foreground hover:text-foreground flex items-center transition-all ${
              isCollapsed ? 'justify-center px-0 h-9' : 'justify-start px-3 h-9 gap-3'
            }`}
          >
            {desktopCollapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="truncate">Recolher menu</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
