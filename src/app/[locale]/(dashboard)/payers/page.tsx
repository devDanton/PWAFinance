import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayerList } from './payer-list'

export const dynamic = 'force-dynamic'

export default async function PayersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/pt/login')
  }

  const { data: workspaces } = await supabase.from('workspaces').select('id, name')
  const { data: payers } = await supabase.from('payers').select('id, name, workspace_id, created_at')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pagadores / Terceiros</h1>
        <p className="text-muted-foreground">
          Gerencie as pessoas que realizam gastos nos seus cartões ou contas.
        </p>
      </div>

      <PayerList 
        initialPayers={payers || []} 
        workspaces={workspaces || []} 
      />
    </div>
  )
}
