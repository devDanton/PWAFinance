"use client"

import Link from "next/link"
import { usePathname } from "@/i18n/routing"
import { LayoutDashboard, ReceiptText, CreditCard, Wallet, Users, Settings } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transações", href: "/transactions", icon: ReceiptText },
    { name: "Cartões", href: "/cards", icon: CreditCard },
    { name: "Workspaces", href: "/workspaces", icon: Users },
    { name: "Configurações", href: "/settings", icon: Settings },
  ]

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="">PWAFinance</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  isActive ? "bg-muted text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
