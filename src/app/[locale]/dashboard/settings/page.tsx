import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as preferências da sua conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Informações básicas da sua conta no PWAFinance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Nome</p>
            <p className="text-sm text-muted-foreground">{user?.user_metadata?.first_name || 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">E-mail</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <LogoutButton />
        </CardFooter>
      </Card>
    </div>
  )
}
