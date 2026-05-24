"use client"

import * as React from "react"
import { Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "@/i18n/routing"
import { useLocale } from "next-intl"

export function LanguageToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  const switchLocale = (newLocale: "en" | "pt") => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => switchLocale("pt")}
          className={locale === "pt" ? "font-bold bg-muted" : ""}
        >
          Português
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => switchLocale("en")}
          className={locale === "en" ? "font-bold bg-muted" : ""}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
