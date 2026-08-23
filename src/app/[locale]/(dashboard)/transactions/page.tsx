import { createClient } from '@/lib/supabase/server'
import { TransactionList } from './transaction-list'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaces } = await supabase.from('workspaces').select('id, name')
  const { data: cards } = await supabase.from('credit_cards').select('id, name, workspace_id')
  const { data: categories } = await supabase.from('categories').select('id, name, workspace_id, color')
  const { data: profile } = await supabase.from('profiles').select('transaction_sort_preference').eq('id', user?.id).single()

  const sortPref = profile?.transaction_sort_preference || 'date:desc'
  const [sortField, sortDir] = sortPref.split(':')

  // Prevent Postgrest error if sortField is a relationship (like 'categories')
  const validSortColumns = ['date', 'amount', 'description', 'created_at', 'type', 'is_paid']
  const safeSortField = validSortColumns.includes(sortField) ? sortField : 'date'

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, workspaces(name), credit_cards(name), categories(name)')
    .order(safeSortField, { ascending: sortDir === 'asc' })

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
