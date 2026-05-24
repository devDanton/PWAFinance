import { createClient } from '@/lib/supabase/server'
import { TransactionList } from './transaction-list'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  const { data: cards } = await supabase
    .from('credit_cards')
    .select('id, name, workspace_id')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, workspaces(name), credit_cards(name)')
    .order('date', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        <p className="text-muted-foreground">
          Controle suas receitas e despesas.
        </p>
      </div>

      <TransactionList 
        initialTransactions={transactions || []} 
        workspaces={workspaces || []} 
        cards={cards || []} 
      />
    </div>
  )
}
