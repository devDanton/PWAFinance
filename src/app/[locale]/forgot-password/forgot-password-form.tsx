'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { resetPassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/routing'

export function ForgotPasswordForm() {
  const t = useTranslations('Common')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  async function onSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    const result = await resetPassword(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(true)
    }
  }

  return (
    <Card className="w-full shadow-lg border-primary/20 bg-background/80 backdrop-blur-sm transition-all duration-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Recuperar Senha
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Insira seu e-mail para receber um link de redefinição
        </CardDescription>
      </CardHeader>
      <form action={onSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          {success ? (
            <div className="bg-primary/15 text-primary text-sm p-3 rounded-md animate-in fade-in zoom-in-95 text-center">
              E-mail de recuperação enviado! Verifique sua caixa de entrada.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="exemplo@email.com"
                required
                className="transition-all focus-visible:ring-primary/50"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {!success && (
            <SubmitButton
              className="w-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              pendingText="Aguarde..."
            >
              Enviar link
            </SubmitButton>
          )}

          <div className="text-center text-sm mt-4">
            <Link
              href="/login"
              className="text-primary hover:underline font-medium transition-colors"
            >
              Voltar para o Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
