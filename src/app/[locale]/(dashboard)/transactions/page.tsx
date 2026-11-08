import { createClient } from '@/lib/supabase/server'
import { TransactionList } from './transaction-list'

interface TransactionsPageProps {
  searchParams: Promise<{
    month?: string
    startDate?: string
    endDate?: string
    period?: string // 'month' | 'custom' | 'all'
    dateField?: string // 'date' | 'due_date'
  }>
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const supabase = await createClient()
  const resolvedParams = await searchParams

  // Período padrão: mês atual
  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const periodMode = resolvedParams?.period || (resolvedParams?.startDate || resolvedParams?.endDate ? 'custom' : (resolvedParams?.month ? 'month' : 'month'))
  const selectedMonth = resolvedParams?.month || currentYearMonth
  const targetDateField = resolvedParams?.dateField === 'date' ? 'date' : 'due_date'

  let query = supabase
    .from('transactions')
    .select('*, workspaces(name), credit_cards(name), categories(name), payers(name)')

  // Aplica filtros de data no Supabase
  if (periodMode === 'month') {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const startOfMonth = `${yearStr}-${monthStr.padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonth = `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    query = query
      .gte(targetDateField, startOfMonth)
      .lte(targetDateField, endOfMonth)
  } else if (periodMode === 'custom') {
    if (resolvedParams?.startDate) {
      query = query.gte(targetDateField, resolvedParams.startDate)
    }
    if (resolvedParams?.endDate) {
      query = query.lte(targetDateField, resolvedParams.endDate)
    }
  }

  // Executa todas as queries iniciais em PARALELO (elimina waterfall sequencial)
  const [
    userRes,
    workspacesRes,
    cardsRes,
    categoriesRes,
    payersRes,
    txsRes,
    splitsRes
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name'),
    supabase.from('credit_cards').select('id, name, workspace_id, color, total_limit, due_day, closing_day'),
    supabase.from('categories').select('id, name, workspace_id, color'),
    supabase.from('payers').select('id, name, workspace_id'),
    query.order('due_date', { ascending: true }),
    supabase.from('transaction_splits').select('transaction_id')
  ])

  const user = userRes.data?.user
  const workspaces = workspacesRes.data || []
  const cards = cardsRes.data || []
  const categories = categoriesRes.data || []
  const payers = payersRes.data || []
  const transactions = txsRes.data || []
  const splitsData = splitsRes.data || []

  const splitCountsByTxId: Record<string, number> = {}
  splitsData.forEach((s: { transaction_id: string }) => {
    splitCountsByTxId[s.transaction_id] = (splitCountsByTxId[s.transaction_id] || 0) + 1
  })

  const transactionsWithSplits = transactions.map((tx) => ({
    ...tx,
    has_splits: Boolean(splitCountsByTxId[tx.id] && splitCountsByTxId[tx.id] > 0),
    splits_count: splitCountsByTxId[tx.id] || 0
  }))

  const sortPref = 'due_date:asc'

  const todayDate = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Transações</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Controle suas receitas e despesas.
        </p>
      </div>

      <TransactionList 
        initialTransactions={transactionsWithSplits} 
        workspaces={workspaces || []} 
        cards={cards || []} 
        categories={categories || []}
        payers={payers || []}
        initialSortPreference={sortPref}
        todayDate={todayDate}
        currentPeriodMode={periodMode}
        currentSelectedMonth={selectedMonth}
        currentStartDate={resolvedParams?.startDate || ''}
        currentEndDate={resolvedParams?.endDate || ''}
        currentDateField={targetDateField}
      />
    </div>
  )
}
