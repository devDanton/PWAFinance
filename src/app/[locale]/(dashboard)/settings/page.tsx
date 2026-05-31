import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'
import { ProfileForm } from './profile-form'

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
          <ProfileForm 
            initialName={user?.user_metadata?.first_name || ''} 
            email={user?.email || ''} 
          />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <LogoutButton />
        </CardFooter>
      </Card>
    </div>
  )
}
