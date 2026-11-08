import { createClient } from '@/lib/supabase/server'
import { CardList } from './card-list'

export default async function CardsPage() {
  const supabase = await createClient()

  // Busca em paralelo para eliminar waterfall no servidor
  const [cardsRes, workspacesRes, txsRes] = await Promise.all([
    supabase.from('credit_cards').select('*, workspaces(name)').order('created_at', { ascending: false }),
    supabase.from('workspaces').select('id, name'),
    supabase.from('transactions').select('amount, credit_card_id').not('credit_card_id', 'is', null).eq('is_paid', false)
  ])

  const cards = cardsRes.data || []
  const workspaces = workspacesRes.data || []
  const txs = txsRes.data || []

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
        <p className="text-muted-foreground">
          Gerencie os cartões de crédito dos seus workspaces.
        </p>
      </div>

      <CardList initialCards={cardsWithLimits} workspaces={workspaces || []} />
    </div>
  )
}
