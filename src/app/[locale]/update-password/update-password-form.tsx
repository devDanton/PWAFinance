'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updatePassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function UpdatePasswordForm() {
  const t = useTranslations('Common')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setError(null)
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    const result = await updatePassword(formData)
    
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <Card className="w-full shadow-lg border-primary/20 bg-background/80 backdrop-blur-sm transition-all duration-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Atualizar Senha
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Digite sua nova senha abaixo
        </CardDescription>
      </CardHeader>
      <form action={onSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="transition-all focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="transition-all focus-visible:ring-primary/50"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton
            className="w-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            pendingText="Atualizando..."
          >
            Atualizar senha
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  )
}
