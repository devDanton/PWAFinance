import { createClient } from '@/lib/supabase/server'
import { TransactionList } from './transaction-list'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: workspaces },
    { data: cards },
    { data: categories },
    { data: profile }
  ] = await Promise.all([
    supabase.from('workspaces').select('id, name'),
    supabase.from('credit_cards').select('id, name, workspace_id'),
    supabase.from('categories').select('id, name, workspace_id, color'),
    supabase.from('profiles').select('transaction_sort_preference').eq('id', user?.id).single()
  ])

  const sortPref = profile?.transaction_sort_preference || 'date:desc'
  const [sortField, sortDir] = sortPref.split(':')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, workspaces(name), credit_cards(name), categories(name)')
    .order(sortField || 'date', { ascending: sortDir === 'asc' })

  const todayDate = new Date().toISOString().split('T')[0]

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
        categories={categories || []}
        initialSortPreference={sortPref}
        todayDate={todayDate}
      />
    </div>
  )
}
