import { createClient } from '@/lib/supabase/server'
import { ReimbursementView, TransactionItem } from './reimbursement-view'

export default async function ReimbursementsPage() {
  const supabase = await createClient()

  const { data: workspaces } = await supabase.from('workspaces').select('id, name')
  const { data: cards } = await supabase.from('credit_cards').select('id, name, workspace_id')
  const { data: payers } = await supabase.from('payers').select('id, name, workspace_id')

  // Busca apenas despesas com relacionamentos
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, workspace_id, amount, date, due_date, description, credit_card_id, payer_id, is_paid, type, credit_cards(name), payers(name)')
    .eq('type', 'expense')
    .order('date', { ascending: false })

  // Busca com segurança os splits (caso a tabela transaction_splits já tenha sido criada no Supabase)
  const splitsByTxId: Record<string, Array<{
    id: string;
    payer_id: string;
    amount: number;
    is_paid: boolean;
    notes?: string | null;
    payers?: { name: string } | null;
  }>> = {}

  interface SplitRow {
    id: string;
    transaction_id: string;
    payer_id: string;
    amount: number;
    is_paid: boolean;
    notes?: string | null;
    payers?: { name: string } | null;
  }

  try {
    const { data: splitsData, error: splitsError } = await supabase
      .from('transaction_splits')
      .select('id, transaction_id, payer_id, amount, is_paid, notes, payers(name)')

    if (!splitsError && splitsData) {
      (splitsData as unknown as SplitRow[]).forEach((s) => {
        if (!splitsByTxId[s.transaction_id]) {
          splitsByTxId[s.transaction_id] = []
        }
        splitsByTxId[s.transaction_id].push(s)
      })
    }
  } catch (err) {
    console.warn('Tabela transaction_splits ainda não foi criada no banco de dados:', err)
  }

  // Mescla transações com seus splits
  const transactionsWithSplits = (transactions || []).map(tx => ({
    ...tx,
    splits: splitsByTxId[tx.id] || []
  }))

  const todayDate = new Date().toISOString().split('T')[0]

  return (
    <ReimbursementView
      workspaces={workspaces || []}
      cards={cards || []}
      payers={payers || []}
      transactions={transactionsWithSplits as unknown as TransactionItem[]}
      todayDate={todayDate}
    />
  )
}
