"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export function ProfileForm({ initialName, email }: { initialName: string, email: string }) {
  const [name, setName] = useState(initialName || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: name }
      })
      if (error) throw error
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Nome</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Seu nome"
              className="max-w-[250px]"
              disabled={isLoading}
            />
            <Button size="sm" onClick={handleSave} disabled={isLoading}>Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => {
              setName(initialName || '')
              setIsEditing(false)
            }} disabled={isLoading}>Cancelar</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{initialName || 'Não informado'}</p>
            <Button size="sm" variant="link" className="h-auto p-0" onClick={() => setIsEditing(true)}>Alterar</Button>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">E-mail</p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}
