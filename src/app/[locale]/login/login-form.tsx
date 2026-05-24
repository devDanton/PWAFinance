'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { login, signup } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from '@/i18n/routing'

export function LoginForm() {
  const t = useTranslations('Common')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(formData: FormData) {
    setError(null)
    const result = isLogin ? await login(formData) : await signup(formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <Card className="w-full shadow-lg border-primary/20 bg-background/80 backdrop-blur-sm transition-all duration-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          {isLogin ? 'Entrar' : 'Criar Conta'}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          {isLogin
            ? 'Insira suas credenciais para acessar seu Workspace'
            : 'Preencha os dados abaixo para começar a usar o PWAFinance'}
        </CardDescription>
      </CardHeader>
      <form action={onSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome Completo</Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="Seu nome"
                required
                className="transition-all focus-visible:ring-primary/50"
              />
            </div>
          )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              {isLogin && (
                <a href="#" className="text-xs text-primary hover:underline font-medium transition-colors">
                  Esqueceu a senha?
                </a>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="transition-all focus-visible:ring-primary/50"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton
            className="w-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            pendingText="Aguarde..."
          >
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </SubmitButton>

          {/* Registro desabilitado temporariamente para uso pessoal 
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta? ' : 'Já possui uma conta? '}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium transition-colors"
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </div>
          */}
        </CardFooter>
      </form>
    </Card>
  )
}
