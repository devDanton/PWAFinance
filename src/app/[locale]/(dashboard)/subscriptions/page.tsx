import { createClient } from '@/lib/supabase/server'
import { SubscriptionList } from './subscription-list'

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  const { data: cards } = await supabase
    .from('credit_cards')
    .select('id, name, workspace_id')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, workspace_id, color')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, workspaces(name), credit_cards(name), categories(name, color)')
    .order('next_date', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinaturas e Recorrências</h1>
        <p className="text-muted-foreground">
          Gerencie despesas e receitas que se repetem periodicamente.
        </p>
      </div>

      <SubscriptionList
        initialSubscriptions={subscriptions || []}
        workspaces={workspaces || []}
        cards={cards || []}
        categories={categories || []}
      />
    </div>
  )
}
