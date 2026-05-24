'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/' // Force a full reload to clear states
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
    </Button>
  )
}
