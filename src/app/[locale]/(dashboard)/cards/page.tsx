import { createClient } from '@/lib/supabase/server'
import { CardList } from './card-list'

export default async function CardsPage() {
  const supabase = await createClient()

  // For this view, we need to fetch all cards belonging to the workspaces the user is in.
  const { data: cards, error: cardsError } = await supabase
    .from('credit_cards')
    .select('*, workspaces(name)')
    .order('created_at', { ascending: false })

  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id, name')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, credit_card_id')
    .not('credit_card_id', 'is', null)
    .eq('is_paid', false)

  const txs = transactions || []

  const cardsWithLimits = (cards || []).map(card => {
    const used = txs
      .filter(tx => tx.credit_card_id === card.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
    
    return {
      ...card,
      limit_used: used,
      limit_available: Number(card.total_limit) - used
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
        <p className="text-muted-foreground">
          Gerencie os cartões de crédito dos seus workspaces.
        </p>
      </div>

      <CardList initialCards={cardsWithLimits} workspaces={workspaces || []} />
    </div>
  )
}
