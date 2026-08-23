import { createClient } from '@/lib/supabase/server'
import { SubscriptionList } from './subscription-list'

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const [
    { data: workspaces },
    { data: cards },
    { data: categories },
    { data: subscriptions },
    { data: transactions }
  ] = await Promise.all([
    supabase.from('workspaces').select('id, name'),
    supabase.from('credit_cards').select('id, name, workspace_id'),
    supabase.from('categories').select('id, name, workspace_id, color'),
    supabase.from('subscriptions').select('*, workspaces(name), credit_cards(name), categories(name, color)').order('next_date', { ascending: true }),
    supabase.from('transactions').select('amount, description, type, is_paid')
  ])

  const txs = transactions || []
  const subs = subscriptions || []

  // Calcula total gasto em assinaturas (Despesas pagas que dão match no nome)
  const totalSpentOnSubscriptions = subs.reduce((acc, sub) => {
    if (sub.type === 'income') return acc
    const spentForThis = txs
      .filter(tx => tx.is_paid && tx.type === 'expense' && tx.description.toLowerCase().trim() === sub.description.toLowerCase().trim())
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
    return acc + spentForThis
  }, 0)

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinaturas e Recorrências</h1>
          <p className="text-muted-foreground">
            Gerencie despesas e receitas que se repetem periodicamente.
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-4 min-w-[200px] shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Gasto Acumulado</p>
          <p className="text-2xl font-bold text-rose-500">{formatCurrency(totalSpentOnSubscriptions)}</p>
          <p className="text-xs text-muted-foreground mt-1">Soma de todas as assinaturas pagas</p>
        </div>
      </div>

      <SubscriptionList
        initialSubscriptions={subs}
        workspaces={workspaces || []}
        cards={cards || []}
        categories={categories || []}
        transactions={txs}
      />
    </div>
  )
}
